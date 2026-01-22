import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  DollarSign,
  Users,
  ChevronRight,
  Play,
  Check,
  MousePointerClick,
  Target,
  Layers,
  LineChart,
  Clock,
  Menu,
  X
} from 'lucide-react';

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  return { count, start: () => setHasStarted(true) };
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Stats counters
  const affiliates = useCountUp(50000, 2000);
  const conversions = useCountUp(10, 2000);
  const payouts = useCountUp(250, 2000);
  const countries = useCountUp(190, 2000);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Trigger counters when stats section is in view
      const statsSection = document.getElementById('stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8) {
          affiliates.start();
          conversions.start();
          payouts.start();
          countries.start();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className={`home-nav ${scrolled ? 'home-nav-scrolled' : ''}`}>
        <div className="home-nav-container">
          <div className="home-nav-left">
            <Link to="/" className="home-logo">
              <div className="home-logo-icon">
                <Zap className="w-5 h-5" />
              </div>
              <span>AffiliateHub</span>
            </Link>

            <div className="home-nav-links">
              <a href="#features">Products</a>
              <a href="#solutions">Solutions</a>
              <a href="#pricing">Pricing</a>
              <a href="#resources">Resources</a>
            </div>
          </div>

          <div className="home-nav-right">
            <Link to="/login" className="home-nav-link">Sign in</Link>
            <Link to="/register" className="home-nav-cta">
              Start now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            className="home-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="home-mobile-menu">
            <a href="#features">Products</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#resources">Resources</a>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="home-nav-cta">Start now</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-bg">
          <div className="home-hero-gradient"></div>
          <div className="home-hero-grid"></div>
        </div>

        <div className="home-hero-content">
          <div className="home-hero-badge">
            <span className="home-hero-badge-dot"></span>
            Now with AI-powered fraud detection
            <ChevronRight className="w-4 h-4" />
          </div>

          <h1 className="home-hero-title">
            Performance marketing
            <br />
            <span className="home-hero-title-gradient">infrastructure</span>
            <br />
            for the internet
          </h1>

          <p className="home-hero-subtitle">
            Millions of affiliates and advertisers use AffiliateHub to track conversions,
            optimize campaigns, and scale their performance marketing business.
          </p>

          <div className="home-hero-ctas">
            <Link to="/register" className="home-btn-primary">
              Start now <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="home-btn-secondary">
              <Play className="w-5 h-5" /> Watch demo
            </button>
          </div>

          <div className="home-hero-logos">
            <span>Trusted by leading networks</span>
            <div className="home-hero-logos-grid">
              {['MaxBounty', 'ClickBank', 'CJ', 'ShareASale', 'Impact'].map((name) => (
                <div key={name} className="home-hero-logo">{name}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="home-hero-preview">
          <div className="home-preview-window">
            <div className="home-preview-header">
              <div className="home-preview-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="home-preview-url">app.affiliatehub.com/dashboard</div>
            </div>
            <div className="home-preview-content">
              {/* Mini Dashboard */}
              <div className="home-preview-sidebar">
                <div className="home-preview-logo">
                  <Zap className="w-4 h-4" />
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`home-preview-nav-item ${i === 0 ? 'active' : ''}`}></div>
                ))}
              </div>
              <div className="home-preview-main">
                <div className="home-preview-stats">
                  {[
                    { label: 'Total Clicks', value: '1.2M', change: '+12.5%', color: 'blue' },
                    { label: 'Conversions', value: '45.2K', change: '+8.3%', color: 'green' },
                    { label: 'Revenue', value: '$892K', change: '+15.7%', color: 'purple' },
                    { label: 'EPC', value: '$0.74', change: '+4.2%', color: 'orange' },
                  ].map((stat) => (
                    <div key={stat.label} className="home-preview-stat">
                      <div className="home-preview-stat-label">{stat.label}</div>
                      <div className="home-preview-stat-value">{stat.value}</div>
                      <div className={`home-preview-stat-change ${stat.color}`}>{stat.change}</div>
                    </div>
                  ))}
                </div>
                <div className="home-preview-chart">
                  <svg viewBox="0 0 400 120" className="home-preview-chart-svg">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#635bff" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,100 Q50,80 100,60 T200,40 T300,50 T400,20"
                      fill="none"
                      stroke="#635bff"
                      strokeWidth="3"
                      className="home-preview-chart-line"
                    />
                    <path
                      d="M0,100 Q50,80 100,60 T200,40 T300,50 T400,20 L400,120 L0,120 Z"
                      fill="url(#chartGradient)"
                      className="home-preview-chart-area"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="home-stats">
        <div className="home-stats-container">
          {[
            { value: affiliates.count, suffix: 'K+', label: 'Active Affiliates', icon: Users },
            { value: conversions.count, suffix: 'M+', label: 'Monthly Conversions', icon: Target },
            { value: payouts.count, suffix: 'M+', label: 'Payouts Processed', icon: DollarSign },
            { value: countries.count, suffix: '+', label: 'Countries', icon: Globe },
          ].map((stat, i) => (
            <div key={i} className="home-stat">
              <stat.icon className="home-stat-icon" />
              <div className="home-stat-value">
                {stat.value}{stat.suffix}
              </div>
              <div className="home-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="home-features">
        <div className="home-section-container">
          <div className="home-section-header">
            <div className="home-section-badge">Platform</div>
            <h2 className="home-section-title">
              Everything you need to scale
              <span className="home-section-title-gradient"> performance marketing</span>
            </h2>
            <p className="home-section-subtitle">
              A complete toolkit for tracking, optimizing, and scaling your affiliate campaigns
            </p>
          </div>

          <div className="home-features-grid">
            {[
              {
                icon: MousePointerClick,
                title: 'Real-time Click Tracking',
                description: 'Track every click with sub-second precision. Get instant visibility into traffic quality and sources.',
                color: 'blue'
              },
              {
                icon: Target,
                title: 'Conversion Attribution',
                description: 'Accurate S2S postback tracking with support for multiple conversion events and custom parameters.',
                color: 'green'
              },
              {
                icon: Shield,
                title: 'Fraud Detection',
                description: 'AI-powered fraud scoring identifies bot traffic, click fraud, and suspicious patterns in real-time.',
                color: 'purple'
              },
              {
                icon: LineChart,
                title: 'Advanced Analytics',
                description: 'Deep insights into performance by offer, source, geo, device, and custom dimensions.',
                color: 'orange'
              },
              {
                icon: Layers,
                title: 'Smart Link Management',
                description: 'Create trackable links with custom sub-IDs, deep linking, and automatic A/B rotation.',
                color: 'pink'
              },
              {
                icon: Clock,
                title: 'Instant Payouts',
                description: 'Flexible payment options with automatic calculations and detailed payout reports.',
                color: 'cyan'
              },
            ].map((feature, i) => (
              <div key={i} className={`home-feature-card home-feature-${feature.color}`}>
                <div className={`home-feature-icon home-feature-icon-${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="home-feature-title">{feature.title}</h3>
                <p className="home-feature-description">{feature.description}</p>
                <a href="#" className="home-feature-link">
                  Learn more <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Preview Section - Stripe Style */}
      <section className="home-code-section">
        <div className="home-section-container">
          <div className="home-code-grid">
            <div className="home-code-content">
              <div className="home-section-badge">Developer-first</div>
              <h2 className="home-section-title">
                Integrate in minutes,
                <span className="home-section-title-gradient"> not weeks</span>
              </h2>
              <p className="home-section-subtitle">
                Our simple postback API makes integration effortless. Start tracking conversions with just a few lines of code.
              </p>

              <div className="home-code-features">
                {[
                  'Simple HTTP postback integration',
                  'Real-time conversion tracking',
                  'Automatic retry on failure',
                  'Detailed webhook logs'
                ].map((item, i) => (
                  <div key={i} className="home-code-feature">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <a href="#" className="home-link-arrow">
                View API documentation <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="home-code-preview">
              <div className="home-code-window">
                <div className="home-code-header">
                  <div className="home-code-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="home-code-tabs">
                    <span className="active">postback.js</span>
                    <span>config.js</span>
                  </div>
                </div>
                <pre className="home-code-block">
                  <code>{`// Fire conversion postback
const response = await fetch(
  'https://track.affiliatehub.com/postback',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      click_id: 'LX8K2M9P4Q',
      event: 'purchase',
      payout: 45.00,
      revenue: 67.50,
      transaction_id: 'txn_123456'
    })
  }
);

// Response: { success: true, conversion_id: "cv_..." }`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="home-testimonials">
        <div className="home-section-container">
          <div className="home-section-header">
            <div className="home-section-badge">Testimonials</div>
            <h2 className="home-section-title">
              Loved by performance marketers
              <span className="home-section-title-gradient"> worldwide</span>
            </h2>
          </div>

          <div className="home-testimonials-grid">
            {[
              {
                quote: "AffiliateHub transformed how we manage our affiliate program. The fraud detection alone saved us $50K in the first month.",
                author: "Sarah Chen",
                role: "VP Marketing, TechStart",
                avatar: "SC"
              },
              {
                quote: "The real-time analytics are incredible. We can now optimize campaigns on the fly and see results instantly.",
                author: "Michael Rodriguez",
                role: "Affiliate Manager, MediaBuyers",
                avatar: "MR"
              },
              {
                quote: "Finally, a tracking platform that just works. Clean interface, reliable tracking, and amazing support.",
                author: "Emma Williams",
                role: "Founder, GrowthHacks",
                avatar: "EW"
              }
            ].map((testimonial, i) => (
              <div key={i} className="home-testimonial-card">
                <div className="home-testimonial-stars">
                  {[...Array(5)].map((_, j) => (
                    <span key={j}>★</span>
                  ))}
                </div>
                <p className="home-testimonial-quote">"{testimonial.quote}"</p>
                <div className="home-testimonial-author">
                  <div className="home-testimonial-avatar">{testimonial.avatar}</div>
                  <div>
                    <div className="home-testimonial-name">{testimonial.author}</div>
                    <div className="home-testimonial-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="home-pricing">
        <div className="home-section-container">
          <div className="home-section-header">
            <div className="home-section-badge">Pricing</div>
            <h2 className="home-section-title">
              Simple, transparent
              <span className="home-section-title-gradient"> pricing</span>
            </h2>
            <p className="home-section-subtitle">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="home-pricing-grid">
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: 'forever',
                description: 'Perfect for getting started',
                features: [
                  'Up to 10K clicks/month',
                  '1 user',
                  'Basic analytics',
                  'Email support'
                ],
                cta: 'Get started',
                popular: false
              },
              {
                name: 'Pro',
                price: '$99',
                period: '/month',
                description: 'For growing businesses',
                features: [
                  'Up to 500K clicks/month',
                  '5 users',
                  'Advanced analytics',
                  'Fraud detection',
                  'API access',
                  'Priority support'
                ],
                cta: 'Start free trial',
                popular: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large networks',
                features: [
                  'Unlimited clicks',
                  'Unlimited users',
                  'Custom integrations',
                  'Dedicated account manager',
                  'SLA guarantee',
                  'White-label option'
                ],
                cta: 'Contact sales',
                popular: false
              }
            ].map((plan, i) => (
              <div key={i} className={`home-pricing-card ${plan.popular ? 'home-pricing-popular' : ''}`}>
                {plan.popular && <div className="home-pricing-badge">Most popular</div>}
                <div className="home-pricing-name">{plan.name}</div>
                <div className="home-pricing-price">
                  {plan.price}
                  <span>{plan.period}</span>
                </div>
                <div className="home-pricing-description">{plan.description}</div>
                <ul className="home-pricing-features">
                  {plan.features.map((feature, j) => (
                    <li key={j}>
                      <Check className="w-5 h-5 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`home-pricing-cta ${plan.popular ? 'primary' : ''}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="home-cta">
        <div className="home-cta-bg">
          <div className="home-cta-gradient"></div>
        </div>
        <div className="home-cta-content">
          <h2 className="home-cta-title">
            Ready to scale your<br />performance marketing?
          </h2>
          <p className="home-cta-subtitle">
            Join thousands of affiliates and advertisers already using AffiliateHub
          </p>
          <div className="home-cta-buttons">
            <Link to="/register" className="home-btn-white">
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#" className="home-btn-ghost-white">
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-container">
          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <Link to="/" className="home-logo">
                <div className="home-logo-icon">
                  <Zap className="w-5 h-5" />
                </div>
                <span>AffiliateHub</span>
              </Link>
              <p className="home-footer-tagline">
                The performance marketing platform for the modern internet.
              </p>
              <div className="home-footer-social">
                <a href="#">Twitter</a>
                <a href="#">LinkedIn</a>
                <a href="#">GitHub</a>
              </div>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'API', 'Integrations', 'Changelog']
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Press', 'Partners']
              },
              {
                title: 'Resources',
                links: ['Documentation', 'Help Center', 'Community', 'Status', 'Contact']
              },
              {
                title: 'Legal',
                links: ['Privacy', 'Terms', 'Security', 'Cookies']
              }
            ].map((section, i) => (
              <div key={i} className="home-footer-section">
                <h4>{section.title}</h4>
                <ul>
                  {section.links.map((link, j) => (
                    <li key={j}><a href="#">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="home-footer-bottom">
            <p>&copy; 2024 AffiliateHub. All rights reserved.</p>
            <div className="home-footer-locale">
              <Globe className="w-4 h-4" />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
