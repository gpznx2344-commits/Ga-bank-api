const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middlewares
app.use(cors({
  origin: '*' // permite que qualquer site (incluindo Netlify) acesse a API
}));
app.use(bodyParser.json());

// Função para ler o banco
async function readDB() {
    try {
        if (!await fs.pathExists(DB_FILE)) {
            await fs.writeJson(DB_FILE, { contas: [] }, { spaces: 2 });
        }
        return await fs.readJson(DB_FILE);
    } catch (err) {
        console.error(err);
        return { contas: [] };
    }
}

// Função para salvar o banco
async function writeDB(data) {
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
}

// Rota teste
app.get('/', (req, res) => {
    res.send('GA Bank API funcionando!');
});

// Pegar todas as contas
app.get('/contas', async (req, res) => {
    const db = await readDB();
    res.json(db.contas);
});

// Criar conta (ajustado para front Netlify)
app.post('/contas', async (req, res) => {
    const { nome, email, senha, cpf } = req.body;
    if (!nome || !email || !senha || !cpf) {
        return res.status(400).json({ message: 'Campos faltando' });
    }

    const db = await readDB();
    const existe = db.contas.find(c => c.email === email || c.cpf === cpf);
    if (existe) {
        return res.status(400).json({ message: 'Conta já existe' });
    }

    const novaConta = {
        id: Date.now(),
        nome,
        email,
        senha,
        cpf,
        saldo: 0,
        chavePix: null // adiciona campo padrão pra PIX
    };

    db.contas.push(novaConta);
    await writeDB(db);
    res.status(201).json(novaConta);
});

// Transferência (PIX entre contas)
app.post('/pix', async (req, res) => {
    const { remetenteEmail, destinatarioEmail, valor } = req.body;
    if (!remetenteEmail || !destinatarioEmail || !valor) return res.status(400).json({ erro: 'Dados faltando' });

    const db = await readDB();
    const remetente = db.contas.find(c => c.email === remetenteEmail);
    const destinatario = db.contas.find(c => c.email === destinatarioEmail);

    if (!remetente || !destinatario) return res.status(404).json({ erro: 'Conta não encontrada' });
    if (remetente.saldo < valor) return res.status(400).json({ erro: 'Saldo insuficiente' });

    remetente.saldo -= valor;
    destinatario.saldo += valor;

    await writeDB(db);
    res.json({ msg: 'PIX realizado com sucesso', remetente, destinatario });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
