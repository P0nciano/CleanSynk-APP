import { Request, Response } from "express";
import { prisma, lavanderiasDo } from "../lib/prisma";
import { AuthRequest } from "../middlewares/autentica";

// Foto enviada pelo app em base64 (com ou sem "data:image/...;base64,"). Só JPEG/PNG até 600 KB.
function lerFoto(foto: unknown): Buffer | null | "invalida" {
  if (foto === undefined || foto === null || foto === "") return null;
  if (typeof foto !== "string") return "invalida";
  const bytes = Buffer.from(foto.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if ((!jpeg && !png) || bytes.length > 600 * 1024) return "invalida";
  return bytes;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeEnderecoGratuito(endereco: string) {
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", endereco);
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("limit", "1");
  nominatimUrl.searchParams.set("addressdetails", "0");

  const osmResponse = await fetch(nominatimUrl.toString(), {
    headers: {
      "User-Agent": "CleanSynk/1.0 (academic project)",
    },
  });

  if (!osmResponse.ok) {
    throw new Error("Falha ao consultar geocoding gratuito");
  }

  const osmData = (await osmResponse.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  if (!Array.isArray(osmData) || osmData.length === 0) {
    throw new Error("Endereço não encontrado no geocoding gratuito");
  }

  const primeiro = osmData[0];
  const lat = Number(primeiro.lat);
  const lng = Number(primeiro.lon);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Geocoding gratuito não retornou coordenadas válidas");
  }

  return {
    latitude: lat,
    longitude: lng,
    enderecoFormatado: primeiro.display_name || endereco,
  };
}

async function geocodeEnderecoGoogle(endereco: string, apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", endereco);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Falha ao consultar Google Geocoding");
  }

  const data = (await response.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    const detalhe = data.error_message ? `: ${data.error_message}` : "";
    throw new Error(`Endereço não encontrado no Google Geocoding${detalhe}`);
  }

  const primeiroResultado = data.results[0];
  const lat = primeiroResultado.geometry?.location?.lat;
  const lng = primeiroResultado.geometry?.location?.lng;

  if (lat === undefined || lng === undefined) {
    throw new Error("Google Geocoding não retornou coordenadas válidas");
  }

  return {
    latitude: lat,
    longitude: lng,
    enderecoFormatado: primeiroResultado.formatted_address || endereco,
  };
}

async function geocodeEndereco(endereco: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return geocodeEnderecoGratuito(endereco);
  }

  try {
    return await geocodeEnderecoGoogle(endereco, apiKey);
  } catch {
    return geocodeEnderecoGratuito(endereco);
  }
}

export class LavanderiaController {
  async geocode(req: Request, res: Response) {
    try {
      const endereco = String(req.query.endereco || "").trim();
      if (!endereco) {
        return res.status(400).json({ error: "endereco é obrigatório" });
      }

      const resultado = await geocodeEndereco(endereco);
      return res.status(200).json(resultado);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar geocoding";
      return res.status(400).json({ error: message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { nome, endereco, latitude, longitude } = req.body;
      // O dono é sempre quem cadastra (rota só para admin)
      const proprietario_id = req.admin!.id;

      if (!nome || !endereco) {
        return res.status(400).json({
          error: "nome e endereco são obrigatórios",
        });
      }

      const foto = lerFoto(req.body.foto);
      if (foto === "invalida") {
        return res.status(400).json({ error: "Foto inválida: use JPEG ou PNG de até 600 KB" });
      }

      const apenasUmaCoordenadaFoiInformada =
        (latitude === undefined && longitude !== undefined) ||
        (latitude !== undefined && longitude === undefined);

      if (apenasUmaCoordenadaFoiInformada) {
        return res.status(400).json({
          error: "informe latitude e longitude juntas, ou omita ambas para geocodificação automática",
        });
      }

      const proprietario = await prisma.usuario.findUnique({
        where: { usuario_id: Number(proprietario_id) },
      });

      if (!proprietario) {
        return res.status(404).json({ error: "Proprietário não encontrado" });
      }

      let latitudeFinal: number;
      let longitudeFinal: number;
      let enderecoFinal = String(endereco);

      if (latitude !== undefined && longitude !== undefined) {
        latitudeFinal = Number(latitude);
        longitudeFinal = Number(longitude);

        if (Number.isNaN(latitudeFinal) || Number.isNaN(longitudeFinal)) {
          return res.status(400).json({ error: "latitude e longitude devem ser números válidos" });
        }
      } else {
        const geocodificado = await geocodeEndereco(String(endereco)).catch(() => null);
        if (!geocodificado) {
          return res.status(400).json({ error: "Endereço não encontrado. Inclua rua, número e cidade." });
        }
        latitudeFinal = geocodificado.latitude;
        longitudeFinal = geocodificado.longitude;
        enderecoFinal = geocodificado.enderecoFormatado;
      }

      const lavanderia = await prisma.lavanderia.create({
        data: {
          nome,
          endereco: enderecoFinal,
          latitude: latitudeFinal,
          longitude: longitudeFinal,
          proprietario_id: Number(proprietario_id),
          ...(foto && { foto: new Uint8Array(foto), foto_versao: 1 }),
        },
      });

      return res.status(201).json(lavanderia);
    } catch (error) {
      console.error("Erro ao cadastrar lavanderia:", error);
      return res.status(500).json({ error: "Erro ao cadastrar lavanderia" });
    }
  }

  // GET /lavanderias/:id/foto — pública para o <Image> carregar sem token; a URL leva ?v=foto_versao
  async foto(req: Request, res: Response) {
    try {
      const lavanderia = await prisma.lavanderia.findUnique({
        where: { lavanderia_id: Number(req.params.id) || 0 },
        select: { foto: true },
      });
      if (!lavanderia?.foto) return res.status(404).json({ error: "Lavanderia sem foto" });
      const bytes = Buffer.from(lavanderia.foto);
      res.setHeader("Content-Type", bytes[0] === 0x89 ? "image/png" : "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      return res.send(bytes);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar foto" });
    }
  }

  // GET /lavanderias/cidade?lat=&lon= — cidade do usuário para o cabeçalho do app (Nominatim, gratuito)
  async cidade(req: Request, res: Response) {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return res.status(400).json({ error: "lat e lon válidos são obrigatórios" });
      }

      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("format", "json");
      url.searchParams.set("zoom", "10");
      url.searchParams.set("accept-language", "pt-BR");
      const resposta = await fetch(url, { headers: { "User-Agent": "CleanSynk/1.0 (academic project)" } });
      if (!resposta.ok) return res.status(502).json({ error: "Falha ao consultar a localização" });

      const { address = {} } = (await resposta.json()) as { address?: Record<string, string> };
      const cidade = address.city || address.town || address.village || address.municipality || address.county;
      if (!cidade) return res.status(404).json({ error: "Cidade não encontrada" });
      // "BR-RS" -> "RS"
      const uf = address["ISO3166-2-lvl4"]?.split("-")[1] ?? address.state ?? "";
      return res.status(200).json({ cidade, uf });
    } catch (error) {
      console.error("Erro ao buscar cidade:", error);
      return res.status(500).json({ error: "Erro ao buscar cidade" });
    }
  }

  // PATCH /lavanderias/:id/foto — só o dono; foto null remove
  async atualizarFoto(req: AuthRequest, res: Response) {
    try {
      const lavanderia = await prisma.lavanderia.findUnique({ where: { lavanderia_id: Number(req.params.id) || 0 } });
      if (!lavanderia) return res.status(404).json({ error: "Lavanderia não encontrada" });
      if (lavanderia.proprietario_id !== req.admin!.id) return res.status(403).json({ error: "Esta lavanderia não é sua" });

      const foto = lerFoto(req.body?.foto);
      if (foto === "invalida") return res.status(400).json({ error: "Foto inválida: use JPEG ou PNG de até 600 KB" });

      const atualizada = await prisma.lavanderia.update({
        where: { lavanderia_id: lavanderia.lavanderia_id },
        // A versão nova muda a URL da foto, e o app baixa a imagem nova
        data: foto ? { foto: new Uint8Array(foto), foto_versao: { increment: 1 } } : { foto: null, foto_versao: 0 },
      });
      return res.status(200).json(atualizada);
    } catch (error) {
      console.error("Erro ao salvar foto:", error);
      return res.status(500).json({ error: "Erro ao salvar foto" });
    }
  }

  // PATCH /lavanderias/:id/precos — só o dono; null volta ao preço padrão
  async atualizarPrecos(req: AuthRequest, res: Response) {
    try {
      const lavanderia = await prisma.lavanderia.findUnique({ where: { lavanderia_id: Number(req.params.id) } });
      if (!lavanderia) return res.status(404).json({ error: "Lavanderia não encontrada" });
      if (lavanderia.proprietario_id !== req.admin!.id) return res.status(403).json({ error: "Esta lavanderia não é sua" });

      const data: Record<string, number | null> = {};
      for (const campo of ["preco_lavagem", "preco_secagem", "preco_lava_seca"]) {
        const valor = req.body?.[campo];
        if (valor === undefined) continue;
        if (valor === null) { data[campo] = null; continue; }
        const numero = Number(valor);
        if (!Number.isFinite(numero) || numero < 1 || numero > 999) {
          return res.status(400).json({ error: "Os preços devem ficar entre R$ 1,00 e R$ 999,00" });
        }
        data[campo] = Math.round(numero * 100) / 100;
      }

      const atualizada = await prisma.lavanderia.update({ where: { lavanderia_id: lavanderia.lavanderia_id }, data });
      return res.status(200).json(atualizada);
    } catch (error) {
      console.error("Erro ao salvar preços:", error);
      return res.status(500).json({ error: "Erro ao salvar preços" });
    }
  }

  async findAll(req: AuthRequest, res: Response) {
    try {
      const lavanderias = await prisma.lavanderia.findMany({
        where: lavanderiasDo(req),
        include: {
          proprietario: {
            select: {
              usuario_id: true,
              nome: true,
              email: true,
            },
          },
          maquinas: true,
        },
      });

      return res.status(200).json(lavanderias);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar lavanderias" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const lavanderiaId = Number(req.params.id);

      const lavanderia = await prisma.lavanderia.findUnique({
        where: { lavanderia_id: lavanderiaId },
        include: {
          proprietario: {
            select: {
              usuario_id: true,
              nome: true,
              email: true,
            },
          },
          maquinas: {
            include: {
              precos: true,
            },
          },
        },
      });

      if (!lavanderia) {
        return res.status(404).json({ error: "Lavanderia não encontrada" });
      }

      return res.status(200).json(lavanderia);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar lavanderia" });
    }
  }

  async findNearby(req: Request, res: Response) {
    try {
      const latitude = Number(req.query.latitude);
      const longitude = Number(req.query.longitude);
      const raioKm = req.query.raioKm ? Number(req.query.raioKm) : 5;

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return res.status(400).json({ error: "latitude e longitude válidas são obrigatórias" });
      }

      const lavanderias = await prisma.lavanderia.findMany();

      const proximas = lavanderias
        .map((lavanderia) => {
          const distanciaKm = haversineKm(
            latitude,
            longitude,
            lavanderia.latitude,
            lavanderia.longitude,
          );

          return {
            ...lavanderia,
            distanciaKm: Number(distanciaKm.toFixed(2)),
          };
        })
        .filter((lavanderia) => lavanderia.distanciaKm <= raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm);

      return res.status(200).json(proximas);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar lavanderias próximas" });
    }
  }
}
