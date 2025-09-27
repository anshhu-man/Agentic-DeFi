const SponsorsSection = () => {
  const sponsors = [
    { 
      name: "Polygon", 
      logo: (
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white transform rotate-45"></div>
        </div>
      )
    },
    { 
      name: "Uniswap", 
      logo: (
        <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
          <div className="text-white font-bold text-lg">🦄</div>
        </div>
      )
    },
    { 
      name: "1inch", 
      logo: (
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <div className="text-white font-bold text-sm">1"</div>
        </div>
      )
    },
    { 
      name: "Pyth", 
      logo: (
        <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center">
          <div className="w-5 h-5 bg-white rounded-sm transform rotate-12"></div>
        </div>
      )
    },
    { 
      name: "Rootstock", 
      logo: (
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
          <div className="text-white font-bold text-lg">₿</div>
        </div>
      )
    },
    { 
      name: "The Graph", 
      logo: (
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <div className="grid grid-cols-2 gap-1">
            <div className="w-2 h-2 bg-white rounded-sm"></div>
            <div className="w-2 h-2 bg-white rounded-sm"></div>
            <div className="w-2 h-2 bg-white rounded-sm"></div>
            <div className="w-2 h-2 bg-white rounded-sm"></div>
          </div>
        </div>
      )
    },
    { 
      name: "Alchemy", 
      logo: (
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white rounded-full relative">
            <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      )
    }
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
              className="glass-card p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer group w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-2 group-hover:animate-pulse-glow">
                  {sponsor.logo}
                </div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  {sponsor.name}
                </p>
              </div>
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