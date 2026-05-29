/**
 * server.js — Application e-commerce Node.js
 * API REST + page HTML de démonstration
 * Stack : Express + Mongoose (MongoDB)
 */

const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Connexion MongoDB ──────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

mongoose.connect(mongoUri, {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('✅ MongoDB connecté');
  seedProducts(); // Ajouter les produits par défaut
})
.catch(err => {
  console.error('❌ Erreur MongoDB :', err.message);
});

// ── Modèle Produit ─────────────────────────────────────────
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  description: String,
  category:    String,
  stock:       { type: Number, default: 0 },
  image:       String,
  createdAt:   { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', productSchema);

// ── Seed des produits de démonstration ────────────────────
async function seedProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      {
        name: 'Laptop Pro',
        price: 1200,
        description: 'Laptop haute performance pour développeurs',
        category: 'Informatique',
        stock: 15,
        image: '💻',
      },
      {
        name: 'Smartphone X',
        price: 800,
        description: 'Smartphone dernière génération',
        category: 'Mobile',
        stock: 30,
        image: '📱',
      },
      {
        name: 'Casque Audio',
        price: 150,
        description: 'Casque sans fil avec réduction de bruit',
        category: 'Audio',
        stock: 50,
        image: '🎧',
      },
      {
        name: 'Écran 4K',
        price: 450,
        description: 'Moniteur 27 pouces 4K UHD',
        category: 'Informatique',
        stock: 10,
        image: '🖥️',
      },
    ]);
    console.log('🌱 Produits de démonstration ajoutés');
  }
}

// ── Routes ─────────────────────────────────────────────────

// Health check (utilisé par ALB et Ansible)
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status:   'ok',
    app:      'ecommerce-api',
    database: dbStatus,
    uptime:   Math.floor(process.uptime()),
  });
});

// Lister tous les produits
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Obtenir un produit par ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Créer un produit
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Page d'accueil HTML — E-Commerce Store
app.get('/', async (req, res) => {
  const products = await Product.find().catch(() => []);

  const cards = products.map(p => `
    <div class="card">
      <div class="icon">${p.image || '📦'}</div>
      <h3>${p.name}</h3>
      <p class="desc">${p.description || ''}</p>
      <p class="price">$${p.price}</p>
      <p class="stock">Stock : ${p.stock}</p>
      <button onclick="addToCart('${p._id}', '${p.name}', ${p.price})">
        Ajouter au panier 🛒
      </button>
    </div>
  `).join('');

  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>E-Commerce Store</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    header { background: linear-gradient(135deg, #667eea, #764ba2); color: white;
             padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    header h1 { font-size: 1.8rem; }
    .cart-badge { background: #ff6b6b; border-radius: 20px; padding: 6px 16px;
                  font-weight: bold; cursor: pointer; }
    main { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    h2 { margin-bottom: 24px; color: #555; font-size: 1.3rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
    .card { background: white; border-radius: 16px; padding: 24px; text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,.08); transition: transform .2s; }
    .card:hover { transform: translateY(-4px); }
    .icon { font-size: 3rem; margin-bottom: 12px; }
    .card h3 { font-size: 1.2rem; margin-bottom: 8px; }
    .desc { color: #888; font-size: .9rem; margin-bottom: 12px; min-height: 40px; }
    .price { font-size: 1.5rem; font-weight: bold; color: #667eea; margin-bottom: 6px; }
    .stock { font-size: .85rem; color: #aaa; margin-bottom: 16px; }
    button { background: linear-gradient(135deg, #667eea, #764ba2); color: white;
             border: none; border-radius: 8px; padding: 10px 20px;
             cursor: pointer; font-size: .95rem; width: 100%; transition: opacity .2s; }
    button:hover { opacity: .85; }
    .toast { position: fixed; bottom: 30px; right: 30px; background: #4caf50;
             color: white; padding: 14px 24px; border-radius: 10px;
             display: none; font-size: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    footer { text-align: center; padding: 30px; color: #aaa; font-size: .85rem; margin-top: 60px; }
  </style>
</head>
<body>
  <header>
    <h1>🛍️ E-Commerce Store</h1>
    <div class="cart-badge" id="cart-badge">🛒 0 articles</div>
  </header>
  <main>
    <h2>Nos produits (${products.length} articles)</h2>
    <div class="grid">${cards}</div>
  </main>
  <div class="toast" id="toast"></div>
  <footer>DevOps CI/CD Lab — Terraform + Ansible + Docker + GitHub Actions</footer>
  <script>
    let cartCount = 0;
    function addToCart(id, name, price) {
      cartCount++;
      document.getElementById('cart-badge').textContent = '🛒 ' + cartCount + ' article(s)';
      const toast = document.getElementById('toast');
      toast.textContent = name + ' ajouté au panier ! ($' + price + ')';
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 2500);
    }
  </script>
</body>
</html>`);
});

// ── Démarrage du serveur ───────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
});
