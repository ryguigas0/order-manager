// Conecta-se ao banco de dados 'admin' para autenticação, se necessário,
// e depois seleciona os bancos de dados para criação.

print('Iniciando a criação de bancos de dados e coleções...');

// Cria o banco de dados e as coleções para 'order_manager'
db = db.getSiblingDB('order_manager');
db.createCollection('orders');
db.createCollection('reports');

// Cria o banco de dados e a coleção para 'infra'
db = db.getSiblingDB('infra');
db.createCollection('dlq');

print('Bancos de dados e coleções criados com sucesso.');
