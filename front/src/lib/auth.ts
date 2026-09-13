import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthUser } from "./api";

const TOKEN_KEY = "cleansynk.auth.token";
const USER_KEY = "cleansynk.auth.user";

function isWeb() {
  return Platform.OS === "web";
}

function getWebStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export async function saveToken(token: string) {
  if (isWeb()) {
    getWebStorage()?.setItem(TOKEN_KEY, token);
    return;
  }

  try {
    console.log("SALVANDO TOKEN...");
    await AsyncStorage.setItem(TOKEN_KEY, token);

    const teste = await AsyncStorage.getItem(TOKEN_KEY);

    console.log("TOKEN GRAVADO:", teste);
  } catch (e) {
    console.error("ERRO AO SALVAR TOKEN:", e);
  }
}

export async function getStoredToken() {
  if (isWeb()) {
    return getWebStorage()?.getItem(TOKEN_KEY) ?? null;
  }

  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);

    console.log("TOKEN LIDO:", token);

    return token;
  } catch (e) {
    console.error("ERRO AO LER TOKEN:", e);
    return null;
  }
}

export async function clearStoredToken() {
  if (isWeb()) {
    getWebStorage()?.removeItem(TOKEN_KEY);
    return;
  }

  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error("ERRO AO REMOVER TOKEN:", e);
  }
}

export async function saveUser(user: AuthUser) {
  const json = JSON.stringify(user);

  if (isWeb()) {
    getWebStorage()?.setItem(USER_KEY, json);
    return;
  }

  try {
    console.log("SALVANDO USER...");
    await AsyncStorage.setItem(USER_KEY, json);

    const teste = await AsyncStorage.getItem(USER_KEY);

    console.log("USER GRAVADO:", teste);
  } catch (e) {
    console.error("ERRO AO SALVAR USER:", e);
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  let json: string | null = null;

  if (isWeb()) {
    json = getWebStorage()?.getItem(USER_KEY) ?? null;
  } else {
    try {
      json = await AsyncStorage.getItem(USER_KEY);

      console.log("USER LIDO:", json);
    } catch (e) {
      console.error("ERRO AO LER USER:", e);
      return null;
    }
  }

  if (!json) return null;

  try {
    return JSON.parse(json) as AuthUser;
  } catch (e) {
    console.error("ERRO AO CONVERTER USER:", e);
    return null;
  }
}

export async function clearStoredUser() {
  if (isWeb()) {
    getWebStorage()?.removeItem(USER_KEY);
    return;
  }

  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("ERRO AO REMOVER USER:", e);
  }
}