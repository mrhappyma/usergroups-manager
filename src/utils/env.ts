import z from "zod";

const envSchema = z.object({
  TOKEN: z.string(),
  SIGNING_SECRET: z.string(),
  PORT: z.string().default("3000"),
});
export default envSchema.parse(process.env);
