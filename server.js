const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const forbidden = /\.(exe|bat|sh|cmd|js)$/i;
    if (forbidden.test(file.originalname)) {
      return cb(new Error("Type de fichier non autorisé."), false);
    }
    cb(null, true);
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateHtml(data) {
  const labels = {
    email: "Adresse e-mail",
    fournisseur: "Fournisseur de Réappro",
    ean: "EAN",
    cai: "CAI",
    adherence: "Adhérence sol mouillé",
    conso: "Consommation carburant",
    sonore: "Niveau sonore",
    classe: "Classe de performance",
    designation: "Désignation Pneu",
    prixBF: "Prix BF",
    prixAchat: "Prix d'achat"
  };

  const rows = Object.entries(labels).map(([key, label]) => `
    <tr>
      <td style="padding:8px; border:1px solid #ccc; font-weight:bold; background:#f8f8f8;">${label}</td>
      <td style="padding:8px; border:1px solid #ccc;">${data[key] || '<em>(non renseigné)</em>'}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,sans-serif; max-width:700px; margin:auto;">
      <h2 style="color:#007bff; text-align:center;">🛞 Formulaire Création Pneumatique</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        ${rows}
      </table>
      <p style="margin-top:20px;">📎 Fichiers joints inclus si ajoutés dans le formulaire.</p>
    </div>
  `;
}

app.post("/submit-form", upload.array("fichiers[]"), async (req, res) => {
  const formData = req.body;
  const attachments = req.files.map(file => ({
    filename: file.originalname,
    path: file.path
  }));

  const mailOptions = {
    from: `"Formulaire création" <${process.env.EMAIL_USER}>`,
    to: process.env.DEST_EMAIL,
    subject: "📨Demande création référence Pneumatique",
    html: generateHtml(formData),
    attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Formulaire envoyé !");
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).send("Erreur lors de l'envoi.");
  } finally {
    req.files.forEach(file => fs.unlink(file.path, () => {}));
  }
});

app.get("/", (req, res) => {
  res.send("✅ Serveur en ligne pour formulaire pneus !");
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
