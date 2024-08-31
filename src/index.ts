import { App } from "@slack/bolt";
import env from "./utils/env";

const app = new App({
  token: env.TOKEN,
  signingSecret: env.SIGNING_SECRET,
});

app.start(parseInt(env.PORT, 10)).then(() => {
  console.log("⚡️ hurr durr I'ma ninja sloth");
  console.log(`🚀 Server is running on port ${env.PORT}`);
});
