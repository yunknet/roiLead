import React from 'react';

const VideoSection = () => {
    return (
        <section id="video-section" className="py-24 bg-zinc-950 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <span className="text-emerald-500 text-sm font-semibold uppercase tracking-wider">
                        Recursos
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
                        Leads qualificados na palma da mão
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        Tudo que você precisa para encontrar e prospectar novos clientes de forma eficiente.
                    </p>

                    <p className="text-white mt-4 mb-8">
                        Deixa eu te mostrar <span className="font-bold">como funciona</span>. Aperte o Play no vídeo.
                    </p>

                    <div className="mt-8 flex justify-center">
                        <div className="relative mx-auto border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] shadow-2xl">
                            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
                            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                            <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
                            <div className="rounded-[2rem] overflow-hidden w-[300px] h-[600px] bg-black relative">
                                <video
                                    src="/videos/roilead.mp4"
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default VideoSection;
