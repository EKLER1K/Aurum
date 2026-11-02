import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.aurum.tracker",
  appName: "Aurum",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#0A0A0B",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      launchAutoHide: true,
      backgroundColor: "#0A0A0B",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
