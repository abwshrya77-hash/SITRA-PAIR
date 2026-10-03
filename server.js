const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let sessionDir = './auth_info';

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

app.get('/code', async (req, res) => {
  let num = req.query.number;
  if (!num) return res.json({ error: 'اكتب الرقم' });
  num = num.replace(/[^0-9]/g, '');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false,
      browser: ["SITRA", "Chrome", "1.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
      await delay(1500);
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join('-') || code;
      res.json({ code: code });
    } else {
      res.json({ error: 'جلسة موجودة بالفعل' });
    }

    sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'open') {
        console.log('تم الاتصال!');
      }
    });

  } catch (e) {
    console.log(e);
    res.json({ error: 'فشل - حاول مرة اخرى' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SITRA-PAIR شغال على البورت ' + PORT));
