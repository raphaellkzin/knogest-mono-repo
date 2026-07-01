import { validatePersonalDataGate } from "../src/lib/security/personal-data-gate";

async function main() {
  const result = await validatePersonalDataGate();
  if (!result.ok) {
    console.error("Personal-data gate validation failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Personal-data gate validation passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
