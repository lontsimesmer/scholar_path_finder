import { escapeHtml } from "./html-utils.ts";

// Email template styles matching the landing page design
export const emailStyles = `
  body {
    font-family: 'Inter', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1f36;
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #5B7FD3 0%, #4A5FC9 100%);
    color: white;
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    margin: 0 0 8px 0;
    font-weight: 600;
  }
  .header p {
    font-size: 14px;
    margin: 0;
    opacity: 0.9;
  }
  .logo {
    width: 60px;
    height: 60px;
    margin-bottom: 16px;
  }
  .content {
    padding: 40px 30px;
    background: #ffffff;
  }
  .greeting {
    font-size: 18px;
    color: #1a1f36;
    margin-bottom: 20px;
  }
  .greeting strong {
    color: #5B7FD3;
  }
  .intro-text {
    font-size: 15px;
    color: #4a5568;
    margin-bottom: 24px;
  }
  .services-grid {
    margin: 30px 0;
  }
  .service-card {
    background: linear-gradient(145deg, #ffffff, #f8fafc);
    border: 1px solid #e2e8f0;
    border-left: 4px solid #5B7FD3;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .service-card h3 {
    font-size: 16px;
    color: #1a1f36;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .service-card p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }
  .pricing-box {
    background: linear-gradient(135deg, #5B7FD3 0%, #4A5FC9 100%);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 12px;
    margin: 30px 0;
  }
  .pricing-box h2 {
    font-size: 16px;
    margin: 0 0 8px 0;
    opacity: 0.9;
    font-weight: 500;
  }
  .pricing-box .price {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 56px;
    font-weight: 700;
    margin: 8px 0;
  }
  .pricing-box .price-note {
    font-size: 14px;
    opacity: 0.9;
  }
  .cta-container {
    text-align: center;
    margin: 30px 0;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
    color: white;
    padding: 18px 48px;
    text-decoration: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
  }
  .cta-button:hover {
    background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
  }
  .benefits-list {
    background: #f0f7ff;
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
  }
  .benefits-list h3 {
    font-size: 16px;
    color: #1a1f36;
    margin: 0 0 16px 0;
  }
  .benefits-list ul {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }
  .benefits-list li {
    font-size: 14px;
    color: #4a5568;
    padding: 8px 0;
    padding-left: 28px;
    position: relative;
  }
  .benefits-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #5B7FD3;
    font-weight: bold;
  }
  .highlight-box {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    border-left: 4px solid #F59E0B;
    border-radius: 8px;
    padding: 20px;
    margin: 24px 0;
  }
  .highlight-box p {
    margin: 0;
    font-size: 15px;
    color: #92400E;
    font-weight: 500;
  }
  .stats-row {
    display: flex;
    justify-content: space-around;
    margin: 30px 0;
    padding: 20px 0;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }
  .stat-item {
    text-align: center;
  }
  .stat-number {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: #5B7FD3;
  }
  .stat-label {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
  }
  .contact-info {
    background: #f8fafc;
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
  }
  .contact-info p {
    margin: 8px 0;
    font-size: 14px;
    color: #4a5568;
  }
  .contact-info a {
    color: #5B7FD3;
    text-decoration: none;
  }
  .signature {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }
  .signature p {
    margin: 4px 0;
    font-size: 14px;
    color: #4a5568;
  }
  .signature strong {
    color: #1a1f36;
  }
  .footer {
    background: #1a1f36;
    color: #94a3b8;
    text-align: center;
    padding: 30px;
  }
  .footer p {
    margin: 8px 0;
    font-size: 12px;
  }
  .footer a {
    color: #5B7FD3;
    text-decoration: none;
  }
  .social-links {
    margin: 16px 0;
  }
  .social-links a {
    display: inline-block;
    margin: 0 8px;
    color: #94a3b8;
    text-decoration: none;
  }
`;

export function generateWelcomeEmail(name: string, checkoutUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Power Prestation</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Power Prestation!</h1>
          <p>Your Academic & Professional Mobility Partner</p>
        </div>
        
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(name)}</strong>,</p>
          
          <p class="intro-text">
            Thank you for reaching out to us! We're thrilled to be part of your journey towards achieving your academic and professional goals abroad. Our team of experienced consultants is ready to guide you every step of the way.
          </p>
          
          <div class="services-grid">
            <div class="service-card">
              <h3>🎓 University & Study Abroad Advice</h3>
              <p>Personalized guidance for selecting the right universities based on your profile, career goals, and budget.</p>
            </div>
            <div class="service-card">
              <h3>💰 Scholarship & Funding Guidance</h3>
              <p>Expert advice on finding and applying for scholarships and grants tailored to your profile.</p>
            </div>
            <div class="service-card">
              <h3>📋 Complete Application Support</h3>
              <p>End-to-end assistance with document preparation, essays, and interview coaching.</p>
            </div>
            <div class="service-card">
              <h3>✈️ Visa & Travel Preparation</h3>
              <p>Comprehensive guidance on visa applications and pre-departure preparations.</p>
            </div>
          </div>
          
          <div class="pricing-box">
            <h2>Initial Consultation</h2>
            <div class="price">15 625 XAF</div>
            <p class="price-note">One-time investment, approximately equivalent to $25 USD</p>
          </div>
          
          <div class="cta-container">
            <a href="${checkoutUrl}" class="cta-button">Book Your Consultation Now →</a>
          </div>
          
          <div class="benefits-list">
            <h3>What you'll receive:</h3>
            <ul>
              <li>30-60 minute personalized consultation session</li>
              <li>Customized university recommendations</li>
              <li>Scholarship opportunities matching your profile</li>
              <li>Step-by-step application timeline</li>
              <li>Visa process overview for your destination</li>
              <li>Direct Q&A with our expert consultant</li>
            </ul>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <td style="text-align: center; padding: 20px;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #5B7FD3;">5+</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Years Experience</div>
              </td>
              <td style="text-align: center; padding: 20px;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #5B7FD3;">250+</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Students Helped</div>
              </td>
              <td style="text-align: center; padding: 20px;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #5B7FD3;">95%</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Success Rate</div>
              </td>
            </tr>
          </table>
          
          <div class="contact-info">
            <p><strong>Have questions?</strong></p>
            <p>📧 Email: <a href="mailto:powerprestationint@gmail.com">powerprestationint@gmail.com</a></p>
            <p>📞 Phone: <a href="tel:+237674819411">+(237) 674 819 411</a></p>
          </div>
          
          <div class="signature">
            <p>Best regards,</p>
            <p><strong>The Power Prestation Team</strong></p>
            <p style="font-size: 12px; color: #94a3b8;">Empowering your academic journey since 2019</p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Power Prestation</strong></p>
          <p>FOUDA, derrière le FNE-Yaoundé</p>
          <p>© ${new Date().getFullYear()} Power Prestation. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateNurturingEmail(
  name: string, 
  checkoutUrl: string, 
  dayNumber: number
): string {
  const nurturingContent = getNurturingContent(dayNumber);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${nurturingContent.subject}</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Power Prestation</h1>
          <p>${nurturingContent.headerSubtitle}</p>
        </div>
        
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(name)}</strong>,</p>
          
          <p class="intro-text">${nurturingContent.intro}</p>
          
          <div class="highlight-box">
            <p>${nurturingContent.highlight}</p>
          </div>
          
          ${nurturingContent.body}
          
          <div class="pricing-box">
            <h2>Start Your Journey Today</h2>
            <div class="price">15 625 XAF</div>
            <p class="price-note">Your investment in a brighter future, approximately $25 USD</p>
          </div>
          
          <div class="cta-container">
            <a href="${checkoutUrl}" class="cta-button">${nurturingContent.ctaText} →</a>
          </div>
          
          <div class="contact-info">
            <p><strong>Questions? We're here to help!</strong></p>
            <p>📧 <a href="mailto:powerprestationint@gmail.com">powerprestationint@gmail.com</a></p>
            <p>📞 <a href="tel:+237674819411">+(237) 674 819 411</a></p>
          </div>
          
          <div class="signature">
            <p>Warmly,</p>
            <p><strong>The Power Prestation Team</strong></p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Power Prestation</strong></p>
          <p>© ${new Date().getFullYear()} Power Prestation. All rights reserved.</p>
          <p style="font-size: 11px; margin-top: 12px;">
            You're receiving this because you expressed interest in our services. 
            Follow-up emails will end automatically after 14 days.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface NurturingContent {
  subject: string;
  headerSubtitle: string;
  intro: string;
  highlight: string;
  body: string;
  ctaText: string;
}

function getNurturingContent(dayNumber: number): NurturingContent {
  const contents: NurturingContent[] = [
    // Day 1
    {
      subject: "Don't let your dreams wait - Book your consultation",
      headerSubtitle: "Your Future Awaits",
      intro: "We noticed you haven't had a chance to book your consultation yet. We understand - making decisions about your future is important and takes time.",
      highlight: "⏰ The best time to start planning your academic journey is now. Early preparation leads to better opportunities!",
      body: `
        <div class="benefits-list">
          <h3>Why students choose Power Prestation:</h3>
          <ul>
            <li>Personalized guidance tailored to YOUR goals</li>
            <li>Access to exclusive scholarship information</li>
            <li>Expert visa and documentation support</li>
            <li>Network of partner universities worldwide</li>
          </ul>
        </div>
      `,
      ctaText: "Book My Consultation",
    },
    // Day 2
    {
      subject: "🎓 Success stories from students like you",
      headerSubtitle: "Join Our Success Stories",
      intro: "Every day, we help students just like you turn their dreams of studying abroad into reality. Here's what some of them have to say...",
      highlight: "\"Power Prestation changed my life. I'm now pursuing my Master's degree in France on a full scholarship!\" - Marie K.",
      body: `
        <div class="benefits-list">
          <h3>Our students have been accepted to:</h3>
          <ul>
            <li>Top universities in France, Germany & Canada</li>
            <li>Prestigious scholarship programs</li>
            <li>Leading research institutions</li>
            <li>Global internship opportunities</li>
          </ul>
        </div>
        <p class="intro-text">Your success story could be next. All it takes is that first step.</p>
      `,
      ctaText: "Start My Success Story",
    },
    // Day 3
    {
      subject: "💰 Scholarships you might be missing out on",
      headerSubtitle: "Scholarship Opportunities",
      intro: "Did you know that millions of dollars in scholarships go unclaimed every year? Many students simply don't know where to look or how to apply.",
      highlight: "🎯 Our experts have helped students secure over $500,000 in scholarship funding!",
      body: `
        <div class="benefits-list">
          <h3>Scholarships we can help you find:</h3>
          <ul>
            <li>Government-funded scholarships (Erasmus, DAAD, etc.)</li>
            <li>University merit scholarships</li>
            <li>Field-specific grants and fellowships</li>
            <li>Need-based financial aid</li>
          </ul>
        </div>
        <p class="intro-text">Don't leave money on the table. Let us help you find funding for your studies.</p>
      `,
      ctaText: "Discover Scholarships",
    },
    // Day 4
    {
      subject: "📅 Application deadlines are approaching",
      headerSubtitle: "Time-Sensitive Reminder",
      intro: "Many top universities and scholarship programs have deadlines in the coming months. Preparing a strong application takes time - the earlier you start, the better your chances.",
      highlight: "⚠️ Some scholarship deadlines are as early as 2-3 months away. Don't miss your window!",
      body: `
        <div class="benefits-list">
          <h3>What we'll cover in your consultation:</h3>
          <ul>
            <li>Upcoming deadlines relevant to your goals</li>
            <li>Timeline for document preparation</li>
            <li>Strategy for multiple applications</li>
            <li>Priority action items for your situation</li>
          </ul>
        </div>
      `,
      ctaText: "Plan My Timeline",
    },
    // Day 5
    {
      subject: "🌍 Countries you could be studying in",
      headerSubtitle: "Explore Your Options",
      intro: "Have you considered all the possibilities for your academic journey? Different countries offer unique advantages depending on your field and career goals.",
      highlight: "🗺️ We have expertise in France, Germany, Canada, USA, UK, Australia, and many more destinations!",
      body: `
        <div class="benefits-list">
          <h3>Popular destinations and their benefits:</h3>
          <ul>
            <li><strong>France:</strong> Affordable tuition, rich culture, EU opportunities</li>
            <li><strong>Germany:</strong> Free tuition at public universities, strong engineering programs</li>
            <li><strong>Canada:</strong> Post-study work permits, path to immigration</li>
            <li><strong>UK:</strong> Prestigious institutions, 1-year Master's programs</li>
          </ul>
        </div>
        <p class="intro-text">Not sure which country is right for you? That's exactly what we're here to help with!</p>
      `,
      ctaText: "Explore My Options",
    },
    // Day 6
    {
      subject: "✨ What makes Power Prestation different",
      headerSubtitle: "Why Choose Us",
      intro: "You might be wondering what sets us apart from other consultants. Here's why over 250 students have trusted us with their academic journeys...",
      highlight: "🏆 95% success rate - because we don't just process applications, we craft winning strategies.",
      body: `
        <div class="benefits-list">
          <h3>The Power Prestation difference:</h3>
          <ul>
            <li><strong>Personalized approach:</strong> No cookie-cutter advice</li>
            <li><strong>End-to-end support:</strong> From application to arrival</li>
            <li><strong>Transparent pricing:</strong> No hidden fees or surprises</li>
            <li><strong>Ongoing support:</strong> We're here even after you're admitted</li>
          </ul>
        </div>
      `,
      ctaText: "Experience the Difference",
    },
    // Day 7
    {
      subject: "🔑 The key to a successful application",
      headerSubtitle: "Expert Insights",
      intro: "After helping hundreds of students, we've identified what separates successful applications from rejected ones. Want to know the secret?",
      highlight: "💡 It's not just about grades - it's about presenting your unique story in a compelling way.",
      body: `
        <div class="benefits-list">
          <h3>Common mistakes we help you avoid:</h3>
          <ul>
            <li>Generic personal statements that don't stand out</li>
            <li>Missing key requirements or deadlines</li>
            <li>Applying to mismatched programs</li>
            <li>Underestimating visa requirements</li>
          </ul>
        </div>
        <p class="intro-text">In just one consultation, we can identify your strengths and create a winning strategy.</p>
      `,
      ctaText: "Get Expert Guidance",
    },
  ];
  
  // Cycle through the 7 templates for the 14-day sequence
  const index = (dayNumber - 1) % contents.length;
  return contents[index];
}

export const nurturingSubjects = [
  "Don't let your dreams wait - Book your consultation",
  "🎓 Success stories from students like you",
  "💰 Scholarships you might be missing out on",
  "📅 Application deadlines are approaching",
  "🌍 Countries you could be studying in",
  "✨ What makes Power Prestation different",
  "🔑 The key to a successful application",
];
