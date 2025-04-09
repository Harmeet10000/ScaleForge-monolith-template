npx migrate-mongo up -f ./migrate-mongo-config.cjs

export DATABASE="mongodb://127.0.0.1:27017/GHGv2" DB_NAME=GHGv2 && npx migrate-mongo up -f ./migrate-mongo-config.cjs           

npx migrate-mongo status -f ./migrate-mongo-config.cjs

    export DATABASE="mongodb://127.0.0.1:27017/GHGv2" DB_NAME=GHGv2 && npx migrate-mongo down -f ./migrate-mongo-config.cjs           
