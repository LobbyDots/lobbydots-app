import { ExpoConfig } from "expo/config";

// Dominio de los enlaces de invitación (Universal Links iOS / App Links Android).
const DOMAIN = "lobbydots.app";

const config: ExpoConfig = {
  name: "Lobbydots",
  slug: "lobbydots",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "lobbydots",
  userInterfaceStyle: "light",
  icon: "./assets/images/icon.png",
  ios: {
    bundleIdentifier: "app.lobbydots",
    supportsTablet: false,
    associatedDomains: [`applinks:${DOMAIN}`],
  },
  android: {
    package: "app.lobbydots",
    adaptiveIcon: {
      backgroundColor: "#F4F1EA",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: DOMAIN, pathPrefix: "/i" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F4F1EA",
        image: "./assets/images/splash-icon.png",
        imageWidth: 96,
      },
    ],
    [
      "expo-contacts",
      {
        contactsPermission:
          "Lobbydots usa tu agenda para encontrar caminos de presentación. Tus contactos nunca se muestran a nadie.",
      },
    ],
    "expo-notifications",
  ],
  experiments: {
    // typedRoutes off por ahora (sus tipos se generan al correr expo); se
    // reactiva en F5 cuando el árbol de rutas esté estable.
    typedRoutes: false,
    reactCompiler: true,
  },
};

export default config;
