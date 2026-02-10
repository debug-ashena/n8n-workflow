const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.use(express.json());

// دریافت توکن از محیط و حذف فاصله‌های اضافه
const AUTH_TOKEN = (process.env.AUTH_TOKEN || 'default-token').trim();

app.post('/scrape', async (req, res) => {
  // خواندن توکن از هدر و حذف فاصله‌های اضافه
  const token = (req.headers['x-auth-token'] || '').trim();
  
  console.log('🔍 Received token length:', token.length);
  console.log('🔍 Expected token length:', AUTH_TOKEN.length);
  
  if (token !== AUTH_TOKEN) {
    console.log('❌ Token mismatch!');
    console.log('Received (first 10 chars):', token.substring(0, 10) + '...');
    console.log('Expected (first 10 chars):', AUTH_TOKEN.substring(0, 10) + '...');
    return res.status(401).json({ 
      error: 'Unauthorized',
      receivedLength: token.length,
      expectedLength: AUTH_TOKEN.length
    });
  }

  try {
    const { url, company } = req.body;
    
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

    // استخراج متن ساده برای تست اولیه
    const textContent = $('body').text().substring(0, 500);
    
    plans.push({
      company: company,
      raw_text: textContent,
      url: url
    });

    res.json({
      success: true,
      company: company,
      url: url,
      scrapedAt: new Date().toISOString(),
      plans: plans,
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
  console.log(`🔑 AUTH_TOKEN length: ${AUTH_TOKEN.length}`);
});
