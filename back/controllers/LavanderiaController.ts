import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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

  async create(req: Request, res: Response) {
    try {
      const { nome, endereco, latitude, longitude, proprietario_id } = req.body;

      if (!nome || !endereco || !proprietario_id) {
        return res.status(400).json({
          error: "nome, endereco e proprietario_id são obrigatórios",
        });
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
        const geocodificado = await geocodeEndereco(String(endereco));
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
        },
      });

      return res.status(201).json(lavanderia);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao cadastrar lavanderia" });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const lavanderias = await prisma.lavanderia.findMany({
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
