import { useEffect } from 'react';

interface AdBannerProps {
  adSlot: string;
  adClient?: string;
}

export const AdBanner = ({ adSlot, adClient = "ca-pub-6590145237685570" }: AdBannerProps) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div className="flex justify-center my-4 overflow-hidden min-w-[300px] min-h-[250px] w-full">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};
