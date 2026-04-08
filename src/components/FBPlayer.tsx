import React, { useState } from 'react';
import { Loader2, Maximize2 } from 'lucide-react';

interface FBPlayerProps {
  url: string;
  customTop?: string;
  customZoom?: string;
}

const FBPlayer: React.FC<FBPlayerProps> = ({ url, customTop = '0%', customZoom = '100%' }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  if (!url) {
    return (
      <div className="video-evolution-frame" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'var(--text-muted)' }}>
        FLUX INDISPONIBLE
      </div>
    );
  }

  // Fonction pour obtenir l'URL finale
  const getEmbedUrl = (input: string) => {
    let finalUrl = input;
    
    // 1. Si l'utilisateur a collé toute la balise <iframe>, on extrait le src="..."
    if (input.includes('<iframe')) {
      const match = input.match(/src="([^"]+)"/);
      if (match) finalUrl = match[1];
    }

    // 2. Si c'est déjà un lien d'intégration FB (plugins/video.php), on le garde tel quel
    // Mais on s'assure que l'autoplay et le mute sont présents
    if (finalUrl.includes('facebook.com/plugins/video.php')) {
      // On décode pour éviter les doubles encodages si nécessaire
      const urlObj = new URL(finalUrl.replace(/&amp;/g, '&'));
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('mute', '1');
      urlObj.searchParams.set('adapt_container_width', 'true');
      return urlObj.toString();
    }

    // 3. Sinon, c'est un lien FB classique, on construit l'URL d'intégration
    const encodedUrl = encodeURIComponent(finalUrl);
    return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&t=0&autoplay=1&mute=1&adapt_container_width=true`;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="video-evolution-frame">
      <div className="video-inner-container">
        {isLoading && (
          <div className="video-loader">
            <Loader2 className="spinner" size={40} />
            <span>CHARGEMENT DU LIVE...</span>
          </div>
        )}
        
        <iframe
          src={embedUrl}
          className={`fb-iframe ${isLoading ? 'hidden' : 'visible'}`}
          onLoad={() => setIsLoading(false)}
          scrolling="no"
          frameBorder="0"
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Facebook Live Cockfight"
          width={customZoom} 
          height="100%"
          style={{ 
            border: 'none', 
            overflow: 'hidden',
            position: 'absolute',
            top: customTop,
            left: '50%',
            transform: 'translateX(-50%)',
            width: customZoom,
            height: 'auto',
            minHeight: '100%'
          }}
        ></iframe>
      </div>
    </div>
  );
};

export default FBPlayer;
