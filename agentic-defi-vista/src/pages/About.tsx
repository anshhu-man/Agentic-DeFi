import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Twitter, Linkedin } from "lucide-react";
import aiPatternImage from "@/assets/ai-pattern.jpg";

const About = () => {
  const team = [
    { name: "Alex Chen", role: "Co-Founder & CEO", avatar: "👨‍💻" },
    { name: "Sarah Kim", role: "Head of AI", avatar: "👩‍🔬" },
    { name: "Marcus Webb", role: "Blockchain Engineer", avatar: "👨‍🚀" },
    { name: "Lisa Zhang", role: "Product Designer", avatar: "👩‍🎨" },
    { name: "David Park", role: "DeFi Strategist", avatar: "👨‍📊" }
  ];

  const sponsors = [
    { name: "Polygon", logo: "🔷", description: "Scaling Ethereum" },
    { name: "Uniswap", logo: "🦄", description: "Decentralized Exchange" },
    { name: "Pyth", logo: "⚡", description: "Real-time Oracles" },
    { name: "Alchemy", logo: "⚗️", description: "Web3 Infrastructure" },
    { name: "1inch", logo: "🔄", description: "DEX Aggregation" },
    { name: "Rootstock", logo: "₿", description: "Bitcoin DeFi" },
    { name: "The Graph", logo: "📊", description: "Data Indexing" }
  ];

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 opacity-10 rounded-2xl overflow-hidden">
            <img 
              src={aiPatternImage} 
              alt="AI Pattern" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative z-10 py-16">
            <h1 className="text-5xl font-bold mb-6">
              <span className="gradient-text">Our Mission</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Making DeFi navigation easier with AI-powered meta-protocol search. 
              We're building the future of decentralized finance through intelligent 
              automation and cross-chain unification.
            </p>
          </div>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="glass-card text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3">AI-First Approach</h3>
              <p className="text-muted-foreground">
                Leveraging advanced AI agents to provide intelligent insights and automated strategies
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-card text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">🌉</div>
              <h3 className="text-xl font-bold mb-3">Cross-Chain Unity</h3>
              <p className="text-muted-foreground">
                Breaking down silos between blockchains to create a unified DeFi experience
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-card text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-3">User Empowerment</h3>
              <p className="text-muted-foreground">
                Democratizing access to sophisticated DeFi strategies for users of all experience levels
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Meet the <span className="gradient-text">Team</span>
          </h2>
          
          <div className="grid md:grid-cols-5 gap-6">
            {team.map((member, index) => (
              <Card key={index} className="glass-card text-center hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6">
                  <div className="text-5xl mb-4">{member.avatar}</div>
                  <h3 className="font-bold mb-1">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{member.role}</p>
                  
                  <div className="flex justify-center gap-2">
                    <Github className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                    <Twitter className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                    <Linkedin className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sponsors Section */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="gradient-text">Powered By</span>
          </h2>
          
          <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-6">
            {sponsors.map((sponsor, index) => (
              <Card key={index} className="glass-card text-center hover:scale-105 transition-transform duration-300">
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{sponsor.logo}</div>
                  <h3 className="font-bold text-sm mb-1">{sponsor.name}</h3>
                  <p className="text-xs text-muted-foreground">{sponsor.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-muted-foreground mt-8 text-sm">
            Integrating with the most trusted protocols in Web3 to deliver seamless cross-chain experiences
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;