const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.use(express.json());

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'default-token';

app.post('/scrape', async (req, res) => {
  const { url, company, selector } = req.body;

  const token = req.headers['x-auth-token']; 
  
  if (!token || token.trim() !== AUTH_TOKEN.trim()) {
     console.log('Expected token:', AUTH_TOKEN);
     console.log('Received token:', token);
  return res.status(401).json({ error: 'Unauthorized' });
   }
  

  try {
    // دریافت صفحه
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const plans = [];

    // پیدا کردن جدول‌ها
    $(selector || '.package, .plan, .hosting-plan, table').each((i, el) => {
      const plan = {
        company: company,
        raw_html: $(el).html().substring(0, 200)
      };
      
      // استخراج متن کل المان
      plan.textContent = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 300);
      
      plans.push(plan);
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
    res.status(500).json({ 
      error: error.message,
      company: company,
      url: url
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper ready on port ${PORT}`);
});
