import * as Location from "expo-location";
import { getCidade } from "./api";

type Posicao = { latitude: number; longitude: number };

// Uma consulta por sessão, compartilhada pelo cabeçalho e pelas listas; se falhar, a próxima chamada tenta de novo
let posicao: Promise<Posicao> | null = null;
let cidade: Promise<string> | null = null;

export function minhaPosicao() {
  posicao ??= (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Permissão de localização negada");
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: coords.latitude, longitude: coords.longitude };
  })();
  posicao.catch(() => { posicao = null; });
  return posicao;
}

export function minhaCidade() {
  cidade ??= minhaPosicao()
    .then((p) => getCidade(p.latitude, p.longitude))
    .then(({ cidade: nome, uf }) => (uf ? `${nome}, ${uf}` : nome));
  cidade.catch(() => { cidade = null; });
  return cidade;
}

// Distância em linha reta (fórmula de haversine), em km
export function distanciaKm(a: Posicao, b: Posicao) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Mais perto primeiro, já com distanciaKm preenchida para o card mostrar
export function ordenarPorDistancia<T extends Posicao>(lista: T[], origem: Posicao) {
  return lista
    .map((item) => ({ ...item, distanciaKm: distanciaKm(origem, item) }))
    .sort((x, y) => x.distanciaKm - y.distanciaKm);
}
