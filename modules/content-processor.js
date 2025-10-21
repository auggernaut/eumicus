const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const OpenAIClient = require('./openai-client');

// Use built-in fetch for Node.js 18+ or fallback to node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
} catch (error) {
  fetch = require('node-fetch');
}

class ContentProcessor {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
    this.browser = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async processContent(contentInput) {
    console.log('📚 Processing content...');
    
    await this.knowledgeGraph.addActivity({
      type: 'content_processing',
      agent: 'Content Processor',
      message: 'Starting content analysis',
      status: 'in_progress',
      details: { input_type: typeof contentInput }
    });

    let processedContent = null;

    if (typeof contentInput === 'string') {
      if (this.isUrl(contentInput)) {
        processedContent = await this.processUrl(contentInput);
      } else {
        processedContent = await this.processText(contentInput);
      }
    } else if (contentInput.url) {
      processedContent = await this.processUrl(contentInput.url);
    } else if (contentInput.text) {
      processedContent = await this.processText(contentInput.text);
    }

    if (!processedContent) {
      throw new Error('Unable to process content input');
    }

    // Extract concepts and insights
    const extraction = await this.extractKnowledge(processedContent);
    
    // Add to knowledge graph
    const contentItem = await this.knowledgeGraph.addContentItem({
      type: processedContent.type,
      url: processedContent.url,
      title: processedContent.title,
      content: processedContent.content,
      key_concepts: extraction.concepts.map(c => c.name),
      insights: extraction.insights,
      key_takeaways: extraction.key_takeaways,
      processed_date: new Date().toISOString()
    });

    // Add new concepts to knowledge graph
    for (const concept of extraction.concepts) {
      await this.knowledgeGraph.addConcept(concept);
    }

    await this.knowledgeGraph.addActivity({
      type: 'content_processing',
      agent: 'Content Processor',
      message: `Successfully processed ${processedContent.type}: "${processedContent.title}"`,
      status: 'completed',
      details: {
        content_id: contentItem.id,
        concepts_extracted: extraction.concepts.length,
        insights_generated: extraction.insights.length
      }
    });

    return {
      contentItem,
      concepts: extraction.concepts,
      insights: extraction.insights,
      keyTakeaways: extraction.key_takeaways
    };
  }

  isUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  isYouTubeUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
    } catch {
      return false;
    }
  }

  async processUrl(url) {
    console.log(`🌐 Processing URL: ${url}`);
    
    // Check if it's a YouTube URL and use specialized processing
    if (this.isYouTubeUrl(url)) {
      return await this.processYouTubeVideo(url);
    }
    
    let page = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries) {
      try {
        page = await this.browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Add extra headers to avoid detection
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        });
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for content to load
        await page.waitForTimeout(2000);
        
        const content = await page.evaluate(() => {
          // Remove script and style elements
          const scripts = document.querySelectorAll('script, style, nav, header, footer, aside');
          scripts.forEach(el => el.remove());
          
          // Get main content
          const title = document.title;
          const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body;
          const text = mainContent.innerText || mainContent.textContent || '';
          
          return {
            title,
            content: text.trim(),
            url: window.location.href
          };
        });

        await page.close();
        page = null;

        return {
          type: 'webpage',
          url: content.url,
          title: content.title,
          content: content.content
        };

      } catch (error) {
        console.error(`Error processing URL (attempt ${retryCount + 1}):`, error.message);
        
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            console.log('Error closing page:', closeError.message);
          }
          page = null;
        }
        
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error('All retries failed for URL processing:', error);
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    // Fallback to simple fetch if all retries failed
    try {
      console.log('Attempting fallback fetch for URL:', url);
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style, nav, header, footer, aside').remove();
      
      const title = $('title').text() || 'Untitled';
      const content = $('body').text().trim();
      
      return {
        type: 'webpage',
        url,
        title,
        content
      };
    } catch (fetchError) {
      console.error('Fallback fetch also failed:', fetchError);
      throw new Error(`Unable to process URL: ${url}`);
    }
  }

  async processText(text) {
    console.log('📝 Processing text content...');
    
    return {
      type: 'text',
      title: this.generateTitleFromText(text),
      content: text
    };
  }

  generateTitleFromText(text) {
    const words = text.split(' ').slice(0, 8);
    return words.join(' ') + (text.split(' ').length > 8 ? '...' : '');
  }

  async extractKnowledge(content) {
    console.log('🧠 Extracting knowledge from content...');
    
    const existingConcepts = await this.getExistingConcepts();
    
    const extraction = await this.openai.extractConcepts(content.content, existingConcepts);
    
    // Enhance concepts with additional metadata
    const enhancedConcepts = extraction.concepts.map(concept => ({
      ...concept,
      sources: [content.url || 'text_input'],
      last_reinforced: null,
      reinforcement_schedule: this.calculateReinforcementSchedule(concept.confidence),
      created_from: content.type
    }));

    return {
      concepts: enhancedConcepts,
      insights: extraction.insights,
      key_takeaways: extraction.key_takeaways
    };
  }

  async getExistingConcepts() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    return graph.concepts;
  }

  calculateReinforcementSchedule(confidence) {
    const now = new Date();
    let daysToAdd;
    
    if (confidence >= 0.8) {
      daysToAdd = 14; // High confidence - review in 2 weeks
    } else if (confidence >= 0.6) {
      daysToAdd = 7;  // Medium confidence - review in 1 week
    } else {
      daysToAdd = 3;  // Low confidence - review in 3 days
    }
    
    const scheduleDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return scheduleDate.toISOString();
  }

  async processYouTubeVideo(url) {
    console.log(`🎥 Processing YouTube video: ${url}`);
    
    let page = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        page = await this.browser.newPage();
        
        // Set realistic user agent and headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        });
        
        // Set viewport to avoid mobile detection
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate with longer timeout and more lenient wait conditions
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 60000 
        });
        
        // Wait a bit for dynamic content to load
        await page.waitForTimeout(3000);
        
        // Extract video title with multiple selectors
        const title = await page.evaluate(() => {
          const selectors = [
            'h1.ytd-video-primary-info-renderer',
            'h1.title.style-scope.ytd-video-primary-info-renderer',
            'h1[class*="title"]',
            'h1'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
              return element.textContent.trim();
            }
          }
          
          // Fallback to document title
          return document.title.replace(' - YouTube', '').trim();
        });

        // Try to get transcript if available
        let transcript = '';
        try {
          // Look for transcript button with multiple selectors
          const transcriptSelectors = [
            'button[aria-label*="transcript" i]',
            'button[aria-label*="Transcript"]',
            'button[title*="transcript" i]',
            'button[title*="Transcript"]',
            '[data-testid="transcript-button"]',
            'ytd-transcript-segment-renderer'
          ];
          
          let transcriptButton = null;
          for (const selector of transcriptSelectors) {
            transcriptButton = await page.$(selector);
            if (transcriptButton) break;
          }
          
          if (transcriptButton) {
            await transcriptButton.click();
            await page.waitForTimeout(3000);
            
            transcript = await page.evaluate(() => {
              const transcriptSelectors = [
                '[data-testid="transcript"]',
                '.ytd-transcript-segment-renderer',
                '.ytd-transcript-body-renderer',
                '[class*="transcript"]'
              ];
              
              for (const selector of transcriptSelectors) {
                const container = document.querySelector(selector);
                if (container && container.innerText) {
                  return container.innerText.trim();
                }
              }
              return '';
            });
          }
        } catch (transcriptError) {
          console.log('Could not extract transcript:', transcriptError.message);
        }

        // Get video description as fallback content
        let description = '';
        try {
          description = await page.evaluate(() => {
            const descSelectors = [
              '#description-text',
              '.ytd-video-secondary-info-renderer #description-text',
              '[id*="description"]'
            ];
            
            for (const selector of descSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                return element.textContent.trim();
              }
            }
            return '';
          });
        } catch (descError) {
          console.log('Could not extract description:', descError.message);
        }

        await page.close();
        page = null;

        const content = transcript || description || `YouTube video: ${title}`;

        return {
          type: 'youtube_video',
          url,
          title,
          content,
          has_transcript: !!transcript,
          has_description: !!description
        };

      } catch (error) {
        console.error(`Error processing YouTube video (attempt ${retryCount + 1}):`, error.message);
        
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            console.log('Error closing page:', closeError.message);
          }
          page = null;
        }
        
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Final fallback - return basic video info
          console.log('All retries failed, returning basic video info');
          return {
            type: 'youtube_video',
            url,
            title: 'YouTube Video (Title extraction failed)',
            content: `YouTube video content could not be extracted from: ${url}`,
            has_transcript: false,
            has_description: false,
            error: error.message
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }
  }

  async processRSSFeed(feedUrl) {
    console.log(`📡 Processing RSS feed: ${feedUrl}`);
    
    try {
      const response = await fetch(feedUrl);
      const xml = await response.text();
      
      // Simple XML parsing for RSS
      const items = [];
      const titleMatch = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const feedTitle = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'RSS Feed';
      
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const itemXml of itemMatches.slice(0, 10)) { // Limit to 10 items
        const itemTitleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const itemLinkMatch = itemXml.match(/<link>(.*?)<\/link>/);
        const itemDescMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
        
        if (itemTitleMatch && itemLinkMatch) {
          items.push({
            type: 'rss_item',
            title: itemTitleMatch[1] || itemTitleMatch[2],
            url: itemLinkMatch[1],
            content: itemDescMatch ? (itemDescMatch[1] || itemDescMatch[2]) : '',
            source: feedTitle
          });
        }
      }

      return items;

    } catch (error) {
      console.error('Error processing RSS feed:', error);
      throw error;
    }
  }

  async batchProcessContent(contentList) {
    console.log(`📚 Batch processing ${contentList.length} content items...`);
    
    const results = [];
    
    for (const content of contentList) {
      try {
        const result = await this.processContent(content);
        results.push(result);
        
        // Add small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing content:`, error);
        results.push({ error: error.message, content });
      }
    }

    await this.knowledgeGraph.addActivity({
      type: 'batch_processing',
      agent: 'Content Processor',
      message: `Completed batch processing of ${contentList.length} items`,
      status: 'completed',
      details: {
        total_items: contentList.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      }
    });

    return results;
  }
}

module.exports = ContentProcessor;
