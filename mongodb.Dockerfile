# Usa a imagem oficial do MongoDB
FROM mongodb/mongodb-community-server:8.0-ubi8

# Copia o script de inicialização para o diretório de inicialização do MongoDB
# Scripts neste diretório são executados automaticamente na primeira vez que o contêiner é iniciado.
COPY mongo-init.js /docker-entrypoint-initdb.d/
