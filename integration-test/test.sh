npm link
rm -rf tmp;
mkdir tmp;
cp integration-test/integration.ts.template tmp/main.ts;
cd tmp;
npm init -y;
npm install tsx kysely;
npm link kysely-sqlcommenter;
npx tsc --init;
npx tsx main.ts;
# TODO: test tsc