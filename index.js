const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.use(express.json());

const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim();

app.get('/debug', (req, res) => {
  res.json({
    auth_token_exists: !!AUTH_TOKEN,
    auth_token_length: AUTH_TOKEN.length,
    port: process.env.PORT || 3000
  });
});

app.post('/scrape', async (req, res) => {
  const token = (req.headers['x-auth-token'] || '').trim();
  
  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN is EMPTY in environment variables!');
    return res.status(500).json({ error: 'Server misconfiguration: AUTH_TOKEN not set' });
  }
  
  if (token !== AUTH_TOKEN) {
    console.error('❌ Token mismatch!');
    return res.status(401).json({ 
      error: 'Unauthorized',
      received_length: token.length,
      expected_length: AUTH_TOKEN.length
    });
  }

  try {
    const { url, company, selector } = req.body;
    
    if (!url || !company) {
      return res.status(400).json({ error: 'url and company are required' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const plans = [];

    // استخراج داده‌ها از جدول Irpower
    const rows = $('table tr');
    
    if (rows.length > 0) {
      console.log(`Found ${rows.length} rows in table`);
      
      // پردازش هر سطر جدول
      rows.each((i, row) => {
        const cells = $(row).find('td, th');
        
        if (cells.length >= 2) {
          const name = $(cells[0]).text().trim().replace(/\s+/g, ' ');
          const value = $(cells[1]).text().trim().replace(/\s+/g, ' ');
          
          // فقط سطرهای دارای داده را اضافه کن
          if (name && value) {
            plans.push({
              name: name,
              value: value
            });
          }
        }
      });
    } else {
      // فول‌بک: استخراج متن کل بدنه
      plans.push({
        raw_html: $('body').html().substring(0, 300)
      });
    }

    res.json({
      success: true,
      company: company,
      url: url,
      scrapedAt: new Date().toISOString(),
      raw_plans: plans, // داده‌های خام
      count: plans.length
    });

  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Scraper ready on port ${PORT}`);
  console.log(`🔑 AUTH_TOKEN set: ${AUTH_TOKEN ? 'YES' : 'NO'}`);
  console.log(`🔑 AUTH_TOKEN length: ${AUTH_TOKEN.length}`);
});
