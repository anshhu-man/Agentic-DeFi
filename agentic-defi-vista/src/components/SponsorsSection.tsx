const SponsorsSection = () => {
  const sponsors = [
    { name: "Polygon", logo: "🔷" },
    { name: "Uniswap", logo: "🦄" },
    { name: "1inch", logo: "🔄" },
    { name: "Pyth", logo: "⚡" },
    { name: "Rootstock", logo: "₿" },
    { name: "The Graph", logo: "📊" },
    { name: "Alchemy", logo: "⚗️" }
  ];

  return (
    <section className="py-16 border-t border-border/20">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-12 text-muted-foreground">
          Powered by Leading Web3 Infrastructure
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8 items-center">
          {sponsors.map((sponsor) => (
            <div 
              key={sponsor.name}
              className="glass-card p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer group"
            >
              <div className="text-4xl mb-2 group-hover:animate-pulse-glow">
                {sponsor.logo}
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {sponsor.name}
              </p>
            </div>
          ))}
        </div>
        
        <p className="text-muted-foreground mt-8 text-sm">
          Integrating with the most trusted protocols in DeFi to deliver seamless cross-chain experiences
        </p>
      </div>
    </section>
  );
};

export default SponsorsSection;