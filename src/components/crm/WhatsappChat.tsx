import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { toast } from 'sonner';
import { Send, QrCode, LogOut, Loader2, MessageSquare, ChevronLeft, Plus, Edit2, Check, X, Smile, Paperclip, Search, Trash2, UserMinus, Bot, BotOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const DDIS = [
    { code: '+93', country: 'Afeganistão' }, { code: '+27', country: 'África do Sul' }, { code: '+355', country: 'Albânia' },
    { code: '+49', country: 'Alemanha' }, { code: '+376', country: 'Andorra' }, { code: '+244', country: 'Angola' },
    { code: '+1-264', country: 'Anguila' }, { code: '+672', country: 'Antártida' }, { code: '+1-268', country: 'Antígua e Barbuda' },
    { code: '+966', country: 'Arábia Saudita' }, { code: '+213', country: 'Argélia' }, { code: '+54', country: 'Argentina' },
    { code: '+374', country: 'Armênia' }, { code: '+297', country: 'Aruba' }, { code: '+61', country: 'Austrália' },
    { code: '+43', country: 'Áustria' }, { code: '+994', country: 'Azerbaijão' }, { code: '+1-242', country: 'Bahamas' },
    { code: '+973', country: 'Bahrein' }, { code: '+880', country: 'Bangladesh' }, { code: '+1-246', country: 'Barbados' },
    { code: '+32', country: 'Bélgica' }, { code: '+501', country: 'Belize' }, { code: '+229', country: 'Benim' },
    { code: '+1-441', country: 'Bermudas' }, { code: '+375', country: 'Bielorrússia' }, { code: '+591', country: 'Bolívia' },
    { code: '+387', country: 'Bósnia e Herzegovina' }, { code: '+267', country: 'Botsuana' }, { code: '+55', country: 'Brasil' },
    { code: '+673', country: 'Brunei' }, { code: '+359', country: 'Bulgária' }, { code: '+226', country: 'Burquina Faso' },
    { code: '+257', country: 'Burundi' }, { code: '+975', country: 'Butão' }, { code: '+238', country: 'Cabo Verde' },
    { code: '+237', country: 'Camarões' }, { code: '+855', country: 'Camboja' }, { code: '+1', country: 'Canadá' },
    { code: '+974', country: 'Catar' }, { code: '+7', country: 'Cazaquistão' }, { code: '+235', country: 'Chade' },
    { code: '+56', country: 'Chile' }, { code: '+86', country: 'China' }, { code: '+357', country: 'Chipre' },
    { code: '+57', country: 'Colômbia' }, { code: '+269', country: 'Comores' }, { code: '+242', country: 'Congo-Brazzaville' },
    { code: '+243', country: 'Congo-Kinshasa' }, { code: '+850', country: 'Coreia do Norte' }, { code: '+82', country: 'Coreia do Sul' },
    { code: '+225', country: 'Costa do Marfim' }, { code: '+506', country: 'Costa Rica' }, { code: '+385', country: 'Croácia' },
    { code: '+53', country: 'Cuba' }, { code: '+599', country: 'Curaçao' }, { code: '+45', country: 'Dinamarca' },
    { code: '+253', country: 'Djibuti' }, { code: '+1-767', country: 'Dominica' }, { code: '+20', country: 'Egito' },
    { code: '+503', country: 'El Salvador' }, { code: '+971', country: 'Emirados Árabes Unidos' }, { code: '+593', country: 'Equador' },
    { code: '+291', country: 'Eritreia' }, { code: '+421', country: 'Eslováquia' }, { code: '+386', country: 'Eslovênia' },
    { code: '+34', country: 'Espanha' }, { code: '+1', country: 'Estados Unidos' }, { code: '+372', country: 'Estônia' },
    { code: '+251', country: 'Etiópia' }, { code: '+679', country: 'Fiji' }, { code: '+63', country: 'Filipinas' },
    { code: '+358', country: 'Finlândia' }, { code: '+33', country: 'França' }, { code: '+241', country: 'Gabão' },
    { code: '+220', country: 'Gâmbia' }, { code: '+233', country: 'Gana' }, { code: '+995', country: 'Geórgia' },
    { code: '+350', country: 'Gibraltar' }, { code: '+1-473', country: 'Granada' }, { code: '+30', country: 'Grécia' },
    { code: '+299', country: 'Groenlândia' }, { code: '+590', country: 'Guadalupe' }, { code: '+1-671', country: 'Guam' },
    { code: '+502', country: 'Guatemala' }, { code: '+592', country: 'Guiana' }, { code: '+594', country: 'Guiana Francesa' },
    { code: '+224', country: 'Guiné' }, { code: '+240', country: 'Guiné Equatorial' }, { code: '+245', country: 'Guiné-Bissau' },
    { code: '+509', country: 'Haiti' }, { code: '+504', country: 'Honduras' }, { code: '+852', country: 'Hong Kong' },
    { code: '+36', country: 'Hungria' }, { code: '+967', country: 'Iêmen' }, { code: '+1-345', country: 'Ilhas Caiman' },
    { code: '+682', country: 'Ilhas Cook' }, { code: '+298', country: 'Ilhas Faroé' }, { code: '+500', country: 'Ilhas Malvinas' },
    { code: '+692', country: 'Ilhas Marshall' }, { code: '+677', country: 'Ilhas Salomão' }, { code: '+1-340', country: 'Ilhas Virgens Americanas' },
    { code: '+1-284', country: 'Ilhas Virgens Britânicas' }, { code: '+91', country: 'Índia' }, { code: '+62', country: 'Indonésia' },
    { code: '+98', country: 'Irã' }, { code: '+964', country: 'Iraque' }, { code: '+353', country: 'Irlanda' },
    { code: '+354', country: 'Islândia' }, { code: '+972', country: 'Israel' }, { code: '+39', country: 'Itália' },
    { code: '+1-876', country: 'Jamaica' }, { code: '+81', country: 'Japão' }, { code: '+962', country: 'Jordânia' },
    { code: '+686', country: 'Kiribati' }, { code: '+965', country: 'Kuwait' }, { code: '+856', country: 'Laos' },
    { code: '+266', country: 'Lesoto' }, { code: '+371', country: 'Letônia' }, { code: '+961', country: 'Líbano' },
    { code: '+231', country: 'Libéria' }, { code: '+218', country: 'Líbia' }, { code: '+423', country: 'Liechtenstein' },
    { code: '+370', country: 'Lituânia' }, { code: '+352', country: 'Luxemburgo' }, { code: '+853', country: 'Macau' },
    { code: '+389', country: 'Macedônia do Norte' }, { code: '+261', country: 'Madagascar' }, { code: '+60', country: 'Malásia' },
    { code: '+265', country: 'Malaui' }, { code: '+960', country: 'Maldivas' }, { code: '+223', country: 'Mali' },
    { code: '+356', country: 'Malta' }, { code: '+212', country: 'Marrocos' }, { code: '+596', country: 'Martinica' },
    { code: '+230', country: 'Maurício' }, { code: '+222', country: 'Mauritânia' }, { code: '+52', country: 'México' },
    { code: '+95', country: 'Mianmar' }, { code: '+691', country: 'Micronésia' }, { code: '+258', country: 'Moçambique' },
    { code: '+373', country: 'Moldávia' }, { code: '+377', country: 'Mônaco' }, { code: '+976', country: 'Mongólia' },
    { code: '+382', country: 'Montenegro' }, { code: '+1-664', country: 'Montserrat' }, { code: '+264', country: 'Namíbia' },
    { code: '+674', country: 'Nauru' }, { code: '+977', country: 'Nepal' }, { code: '+505', country: 'Nicarágua' },
    { code: '+227', country: 'Níger' }, { code: '+234', country: 'Nigéria' }, { code: '+683', country: 'Niue' },
    { code: '+47', country: 'Noruega' }, { code: '+687', country: 'Nova Caledônia' }, { code: '+64', country: 'Nova Zelândia' },
    { code: '+968', country: 'Omã' }, { code: '+31', country: 'Países Baixos' }, { code: '+680', country: 'Palau' },
    { code: '+970', country: 'Palestina' }, { code: '+507', country: 'Panamá' }, { code: '+675', country: 'Papua-Nova Guiné' },
    { code: '+92', country: 'Paquistão' }, { code: '+595', country: 'Paraguai' }, { code: '+51', country: 'Peru' },
    { code: '+689', country: 'Polinésia Francesa' }, { code: '+48', country: 'Polônia' }, { code: '+1-787', country: 'Porto Rico' },
    { code: '+351', country: 'Portugal' }, { code: '+254', country: 'Quênia' }, { code: '+996', country: 'Quirguistão' },
    { code: '+44', country: 'Reino Unido' }, { code: '+236', country: 'República Centro-Africana' }, { code: '+420', country: 'República Checa' },
    { code: '+1-809', country: 'República Dominicana' }, { code: '+262', country: 'Reunião' }, { code: '+40', country: 'Romênia' },
    { code: '+250', country: 'Ruanda' }, { code: '+7', country: 'Rússia' }, { code: '+212', country: 'Saara Ocidental' },
    { code: '+685', country: 'Samoa' }, { code: '+1-684', country: 'Samoa Americana' }, { code: '+290', country: 'Santa Helena' },
    { code: '+1-758', country: 'Santa Lúcia' }, { code: '+1-869', country: 'São Cristóvão e Névis' }, { code: '+378', country: 'São Marinho' },
    { code: '+508', country: 'São Pedro e Miquelão' }, { code: '+239', country: 'São Tomé e Príncipe' }, { code: '+1-784', country: 'São Vicente e Granadinas' },
    { code: '+221', country: 'Senegal' }, { code: '+232', country: 'Serra Leoa' }, { code: '+381', country: 'Sérvia' },
    { code: '+248', country: 'Seychelles' }, { code: '+65', country: 'Singapura' }, { code: '+1-721', country: 'Sint Maarten' },
    { code: '+963', country: 'Síria' }, { code: '+252', country: 'Somália' }, { code: '+94', country: 'Sri Lanka' },
    { code: '+268', country: 'Suazilândia (Eswatini)' }, { code: '+249', country: 'Sudão' }, { code: '+211', country: 'Sudão do Sul' },
    { code: '+46', country: 'Suécia' }, { code: '+41', country: 'Suíça' }, { code: '+597', country: 'Suriname' },
    { code: '+66', country: 'Tailândia' }, { code: '+886', country: 'Taiwan' }, { code: '+992', country: 'Tajiquistão' },
    { code: '+255', country: 'Tanzânia' }, { code: '+670', country: 'Timor-Leste' }, { code: '+228', country: 'Togo' },
    { code: '+676', country: 'Tonga' }, { code: '+1-868', country: 'Trindade e Tobago' }, { code: '+216', country: 'Tunísia' },
    { code: '+993', country: 'Turcomenistão' }, { code: '+90', country: 'Turquia' }, { code: '+688', country: 'Tuvalu' },
    { code: '+380', country: 'Ucrânia' }, { code: '+256', country: 'Uganda' }, { code: '+598', country: 'Uruguai' },
    { code: '+998', country: 'Uzbequistão' }, { code: '+678', country: 'Vanuatu' }, { code: '+379', country: 'Vaticano' },
    { code: '+58', country: 'Venezuela' }, { code: '+84', country: 'Vietnã' }, { code: '+681', country: 'Wallis e Futuna' },
    { code: '+260', country: 'Zâmbia' }, { code: '+263', country: 'Zimbábue' }
];

export function WhatsappChat({ initialContact, onNavigateToAgent }: { initialContact?: any, onNavigateToAgent?: () => void }) {
    const [status, setStatus] = useState<'loading' | 'disconnected' | 'connected'>('loading');
    const [qrCode, setQrCode] = useState('');
    const [useIaAgent, setUseIaAgent] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [activeLead, setActiveLead] = useState<any>(() => {
        const saved = sessionStorage.getItem('whatsapp_activeLead');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    useEffect(() => {
        if (activeLead) {
            sessionStorage.setItem('whatsapp_activeLead', JSON.stringify(activeLead));
        } else {
            sessionStorage.removeItem('whatsapp_activeLead');
        }
    }, [activeLead]);
    const [inputText, setInputText] = useState('');
    const [searchContactTerm, setSearchContactTerm] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
    const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockDuration, setLockDuration] = useState(1);
    const [lockUnit, setLockUnit] = useState<'min' | 'hour'>('min');
    const [isLocked, setIsLocked] = useState(false);
    const [tokensBalance, setTokensBalance] = useState(0);

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "🙌", "👍", "🙏", "🔥", "❤️", "✅", "🎉", "👀", "💰", "💪", "💡", "⚠️", "❌", "🤝", "🚀"];

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("O arquivo deve ter no máximo 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;

            const mockMsg = {
                id: Date.now().toString(),
                message: file.name,
                media_url: base64String,
                type: file.type.startsWith('image/') ? 'image' : 'document',
                sender: 'me',
                status: 'sending'
            };
            setMessages(prev => [...prev, mockMsg]);

            try {
                const { error } = await supabase.functions.invoke('whatsapp', {
                    body: { action: 'send_media', number: activeLead.phone, media_base64: base64String, file_name: file.name }
                });
                if (error) throw error;
                toast.success("Arquivo enviado pelo WhatsApp!");
            } catch (error) {
                console.error(error);
                toast.error("A integração de arquivos pelo servidor falhou.");
                setMessages(prev => prev.filter(m => m.id !== mockMsg.id));
            }
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newChatDDI, setNewChatDDI] = useState('+55');
    const [newChatDDD, setNewChatDDD] = useState('');
    const [newChatPhone, setNewChatPhone] = useState('');
    const [newChatName, setNewChatName] = useState('');

    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const activeLeadRef = useRef<any>(null);
    useEffect(() => {
        activeLeadRef.current = activeLead;
    }, [activeLead]);

    const processedIdsRef = useRef<Set<string>>(new Set());
    const lastPolledRef = useRef<string>(new Date().toISOString());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialContact && initialContact.timestamp && status === 'connected') {
            const lastHandled = sessionStorage.getItem('whatsapp_last_handled_contact_time');
            if (lastHandled !== initialContact.timestamp.toString()) {
                sessionStorage.setItem('whatsapp_last_handled_contact_time', initialContact.timestamp.toString());
                startChatWithLead(
                    initialContact.phone,
                    initialContact.title || initialContact.company || 'Novo Contato',
                    initialContact.company,
                    initialContact.requestDetails
                );
            }
        }
    }, [initialContact, status]);

    useEffect(() => {
        checkConnection();
        fetchLeads();

        const messagesSubscription = supabase
            .channel('chat_messages_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, handleNewMessage)
            .subscribe();

        const pollInterval = setInterval(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: messagesData, error: messagesError } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', user.id)
                .gt('created_at', lastPolledRef.current)
                .order('created_at', { ascending: true });

            if (!messagesError && messagesData && messagesData.length > 0) {
                const maxDate = new Date(Math.max(...messagesData.map(m => new Date(m.created_at).getTime())));
                lastPolledRef.current = maxDate.toISOString();

                messagesData.forEach(msg => handleNewMessage({ new: msg }));
            }

            const { data: agentData } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (agentData) {
                setUseIaAgent(agentData.is_active);
                setIsLocked(agentData.is_locked === 'sim');
                setTokensBalance(agentData.tokens_balance || 0);
            }

        }, 2000);

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(messagesSubscription);
        };
    }, []);

    const handleNewMessage = async (payload: any) => {
        const newMsg = payload.new;
        if (processedIdsRef.current.has(newMsg.id)) return;
        processedIdsRef.current.add(newMsg.id);

        const { data: { user } } = await supabase.auth.getUser();
        if (user && newMsg.message) {
            newMsg.message = await decryptMessage(newMsg.message, user.id);
        }

        const isCurrentLead = activeLeadRef.current && activeLeadRef.current.phone === newMsg.contact_phone;

        if (isCurrentLead) {
            setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        }

        if (!isCurrentLead && newMsg.sender !== 'me') {
            setUnreadCounts(prev => ({
                ...prev,
                [newMsg.contact_phone]: (prev[newMsg.contact_phone] || 0) + 1
            }));
        }

        fetchLeads();
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === 'disconnected' && qrCode) {
            interval = setInterval(async () => {
                try {
                    const { data, error } = await supabase.functions.invoke('whatsapp', {
                        body: { action: 'get_status' }
                    });

                    if (!error && (data?.state === 'open' || data?.instance?.state === 'open')) {
                        setStatus('connected');
                        setQrCode('');
                        toast.success('WhatsApp Conectado com sucesso!');
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 3500);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, qrCode]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeLead) {
            setMessages([]);
            fetchMessages(activeLead.phone);
            setEditNameValue(activeLead.title);
            setIsEditingName(false);

            interval = setInterval(() => {
                fetchMessages(activeLead.phone, true);
            }, 5000);
        } else {
            setMessages([]);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeLead]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchLeads = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            const uniqueLeadsMap = new Map();
            data.forEach(lead => {
                if (!uniqueLeadsMap.has(lead.phone)) {
                    uniqueLeadsMap.set(lead.phone, lead);
                }
            });

            const uniqueLeads = Array.from(uniqueLeadsMap.values());

            const titleCount: Record<string, number> = {};
            uniqueLeads.forEach(lead => {
                const t = (lead.title || '').trim().toLowerCase();
                if (t && t !== lead.phone) {
                    titleCount[t] = (titleCount[t] || 0) + 1;
                }
            });

            const ownerNames = new Set(
                Object.entries(titleCount)
                    .filter(([_, count]) => count >= 2)
                    .map(([title]) => title)
            );

            const fixedLeads = uniqueLeads.map(lead => {
                const titleLower = (lead.title || '').trim().toLowerCase();

                if (ownerNames.has(titleLower)) {
                    supabase.from('crm_leads')
                        .update({ title: lead.phone })
                        .eq('id', lead.id)
                        .then();
                    return { ...lead, title: lead.phone };
                }
                return lead;
            });

            setLeads(fixedLeads);
        }
    };

    const fetchMessages = async (phone: string, isSilent = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', user.id)
            .eq('contact_phone', phone)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const decryptedData = await Promise.all(
                data.map(async (msg: any) => ({
                    ...msg,
                    message: await decryptMessage(msg.message, user.id)
                }))
            );
            setMessages(prev => {
                if (isSilent && prev.length === decryptedData.length) return prev;
                return decryptedData;
            });
        }
    };

    const checkConnection = async () => {
        setStatus('loading');
        try {
            const { data, error } = await supabase.functions.invoke('whatsapp', {
                body: { action: 'get_status' }
            });
            if (error) throw error;

            if (data?.state === 'open' || data?.instance?.state === 'open') {
                setStatus('connected');

                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: aiAgent } = await supabase.from('ai_agents').select('is_active, tokens_balance').eq('user_id', user.id).maybeSingle();
                        if (aiAgent) {
                            setUseIaAgent(aiAgent.is_active);
                            setTokensBalance(aiAgent.tokens_balance || 0);
                        }
                    }
                } catch (e) {
                    console.log("Erro silencioso ao checar agente atual no db", e);
                }

            } else {
                setStatus('disconnected');
                await connectInstance();
            }
        } catch (error) {
            console.error(error);
            setStatus('disconnected');
        }
    };

    const connectInstance = async () => {
        setLoadingAction(true);
        setQrCode('');
        try {
            const { data, error } = await supabase.functions.invoke('whatsapp', {
                body: { action: 'create_instance', useN8n: useIaAgent }
            });
            if (error) throw error;

            const qrBase64 = data?.qrcode?.base64 || data?.base64;
            if (qrBase64) {
                const finalQrCode = qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
                setQrCode(finalQrCode);
                setStatus('disconnected');
            } else if (data?.state === 'open' || data?.instance?.state === 'open') {
                setStatus('connected');
                toast.success('WhatsApp Conectado!');
            } else {
                toast.error("Não foi possível carregar QR Code.");
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao conectar WhatsApp');
        } finally {
            setLoadingAction(false);
        }
    };
    const handleToggleIaAgent = async (checked: boolean) => {
        if (checked) {
            supabase.functions.invoke('whatsapp', {
                body: { action: 'create_instance' }
            });
        }

        if (checked && tokensBalance <= 0) {
            toast.error("Saldo insuficiente", {
                description: "Você não possui créditos para ativar o agente. Recarregue agora.",
                action: onNavigateToAgent ? {
                    label: "Recarregar",
                    onClick: onNavigateToAgent
                } : undefined
            });
            setTimeout(() => setUseIaAgent(false), 100);
            return;
        }

        setUseIaAgent(checked);
        if (status === 'connected') {
            setLoadingAction(true);
            try {
                const { error } = await supabase.functions.invoke('whatsapp', {
                    body: { action: 'set_webhook', useN8n: checked }
                });
                if (error) throw error;

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('ai_agents').update({ is_active: checked }).eq('user_id', user.id);
                }

                toast.success(checked ? 'Agente de Inteligência Artificial Ativado!' : 'Agente de Inteligência Artificial Desativado!');
            } catch (error) {
                console.error(error);
                toast.error('Erro ao alternar o Agente de IA');
                setUseIaAgent(!checked);
            } finally {
                setLoadingAction(false);
            }
        }
    };

    const confirmDeleteClient = async () => {
        if (!activeLead) return;
        setLoadingAction(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { error: errorMessages } = await supabase
                .from('chat_messages')
                .delete()
                .eq('contact_phone', activeLead.phone)
                .eq('user_id', user.id);

            if (errorMessages) throw errorMessages;

            const { error } = await supabase
                .from('crm_leads')
                .delete()
                .eq('id', activeLead.id)
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success("Cliente e histórico excluídos com sucesso.");
            setActiveLead(null);
            setMessages([]);
            fetchLeads();
            setShowDeleteClientConfirm(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir cliente.");
        } finally {
            setLoadingAction(false);
        }
    };

    const handleLockAgent = async (unlock = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const seconds = unlock ? 0 : (lockUnit === 'min' ? lockDuration * 60 : lockDuration * 3600);
        const lockValue = unlock ? 'não' : 'sim';

        const { error } = await supabase
            .from('ai_agents')
            .update({
                is_locked: lockValue,
                lock_time_seconds: seconds
            })
            .eq('user_id', user.id);

        if (!error) {
            setShowLockModal(false);
            setIsLocked(!unlock);
            toast.success(unlock ? 'Agente destravado com sucesso!' : `Agente travado por ${lockDuration} ${lockUnit === 'min' ? 'minuto(s)' : 'hora(s)'}`);
        } else {
            console.error("Erro ao atualizar agente:", error);
            toast.error(unlock ? 'Erro ao destravar agente' : 'Erro ao travar agente');
        }
    };

    const confirmDeleteChat = async () => {
        if (!activeLead) return;
        setLoadingAction(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('contact_phone', activeLead.phone)
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success("Histórico da conversa excluído com sucesso.");
            setMessages([]);
            setShowDeleteChatConfirm(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir histórico da conversa.");
        } finally {
            setLoadingAction(false);
        }
    };

    const confirmLogout = async () => {
        try {
            const { error } = await supabase.functions.invoke('whatsapp', {
                body: { action: 'delete_instance' }
            });
            if (error) throw error;
            setStatus('disconnected');
            setQrCode('');
            toast.success('Desconectado com sucesso');
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAction(false);
            setShowLogoutConfirm(false);
        }
    };

    const logoutInstance = () => {
        setShowLogoutConfirm(true);
    };

    const startChatWithLead = async (phone: string, title: string, company?: string, requestDetails?: string) => {
        if (!phone) return;

        let existingLead = leads.find(l => l.phone === phone);

        if (!existingLead) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const userDisplayName = (user.user_metadata?.full_name || user.user_metadata?.name || '').trim().toLowerCase();
            const userFirstName = (user.user_metadata?.first_name || userDisplayName.split(' ')[0] || '').trim().toLowerCase();
            const titleLower = (title || '').trim().toLowerCase();

            let safeTitle = title || phone;
            if (titleLower && (titleLower === userFirstName || titleLower === userDisplayName)) {
                safeTitle = phone;
            }

            const { data: dbLead } = await supabase
                .from('crm_leads')
                .select('*')
                .eq('user_id', user.id)
                .eq('phone', phone)
                .maybeSingle();

            if (dbLead) {
                existingLead = dbLead;
            } else {
                const { data: newLead, error } = await supabase.from('crm_leads').insert({
                    user_id: user.id,
                    title: safeTitle,
                    phone: phone,
                    company: company || "WhatsApp",
                    request_details: requestDetails || null,
                    status: 'new',
                    value: 0
                }).select().single();

                if (!error && newLead) {
                    existingLead = newLead;
                    setLeads(prev => [newLead, ...prev]);
                }
            }
        }

        if (existingLead) {
            setActiveLead(existingLead);
            setIsAddingNew(false);
        }
    };

    const handleCreateNewChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatDDD.trim() || !newChatPhone.trim()) {
            toast.error("DDD e Telefone são obrigatórios!");
            return;
        }

        const cleanDDI = newChatDDI.replace(/\D/g, "");
        const cleanDDD = newChatDDD.replace(/\D/g, "");
        const cleanPhone = newChatPhone.replace(/\D/g, "");
        const finalPhone = `${cleanDDI}${cleanDDD}${cleanPhone}`;

        startChatWithLead(finalPhone, newChatName.trim());
        setNewChatDDD('');
        setNewChatPhone('');
        setNewChatName('');
    };

    const saveContactName = async () => {
        if (!activeLead || !editNameValue.trim()) return;

        const { error } = await supabase
            .from('crm_leads')
            .update({ title: editNameValue.trim(), updated_at: new Date().toISOString() })
            .eq('id', activeLead.id);

        if (!error) {
            const updated = { ...activeLead, title: editNameValue.trim() };
            setActiveLead(updated);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setIsEditingName(false);
            toast.success("Nome atualizado!");
        } else {
            toast.error("Erro ao atualizar nome.");
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeLead) return;

        const tempText = inputText;
        setInputText('');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const encryptedText = await encryptMessage(tempText, user.id);
            const { data: newMsg, error: insertError } = await supabase.from('chat_messages').insert([{
                user_id: user.id,
                contact_phone: activeLead.phone,
                message: encryptedText,
                sender: 'me',
                status: 'sending'
            }]).select().single();

            if (!insertError && newMsg) {
                setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), { ...newMsg, message: tempText }]);
            }
        }

        try {
            const { data, error } = await supabase.functions.invoke('whatsapp', {
                body: { action: 'send_message', number: activeLead.phone, text: tempText }
            });
            if (error) throw error;
        } catch (error) {
            toast.error('Erro ao enviar mensagem');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-card overflow-hidden relative">
            {activeLead ? (
                <div className="flex items-center justify-between p-3 pl-12 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                        <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={() => setActiveLead(null)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {isEditingName ? (
                            <div className="flex items-center gap-1 w-full max-w-[200px]">
                                <Input
                                    size={10}
                                    className="h-6 text-sm py-0 px-2 flex-1 min-w-0"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveContactName()}
                                />
                                <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-green-500" onClick={saveContactName}>
                                    <Check className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-red-500" onClick={() => { setIsEditingName(false); setEditNameValue(activeLead.title); }}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 overflow-hidden min-w-0">
                                <span className="font-semibold text-sm truncate" title={activeLead.title}>{activeLead.title}</span>
                                <Button variant="ghost" size="icon" className="w-5 h-5 opacity-50 hover:opacity-100 shrink-0" onClick={() => setIsEditingName(true)}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {status === 'connected' && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowLockModal(true)}
                                    className={`h-7 px-2 text-[10px] gap-1 transition-all duration-300 font-bold ${isLocked
                                        ? 'border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white'
                                        : 'border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white'
                                        }`}
                                >
                                    {isLocked ? (
                                        <>
                                            <Bot className="w-3 h-3" />
                                            Destravar Agente
                                        </>
                                    ) : (
                                        <>
                                            <BotOff className="w-3 h-3" />
                                            Travar Agente IA
                                        </>
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => setShowDeleteClientConfirm(true)} title="Deletar Cliente">
                                    <UserMinus className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6 text-orange-500 hover:bg-orange-500/10 hover:text-orange-600" onClick={() => setShowDeleteChatConfirm(true)} title="Limpar Mensagens">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Conectado" />
                            </div>
                        )}
                        {status === 'disconnected' && (
                            <div className="w-2 h-2 rounded-full bg-red-500" title="Desconectado" />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col p-3 pl-12 border-b border-border bg-muted/20 gap-3">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <MessageSquare className="w-4 h-4" />
                            <span>WhatsApp</span>
                            {status === 'connected' && (
                                <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground ml-1" onClick={() => setIsAddingNew(!isAddingNew)} title="Nova Conversa">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            {status === 'connected' && (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" title="Conectado" />
                                    <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground" onClick={logoutInstance} disabled={loadingAction} title="Desconectar">
                                        <LogOut className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}
                            {status === 'disconnected' && (
                                <div className="w-2 h-2 rounded-full bg-red-500" title="Desconectado" />
                            )}
                        </div>
                    </div>
                    {status === 'connected' && (
                        <div className="flex flex-col gap-2 w-full mt-2">
                            <div className="relative w-full">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Pesquisar conversa rápida..."
                                    value={searchContactTerm}
                                    onChange={(e) => setSearchContactTerm(e.target.value)}
                                    className="pl-9 h-8 text-xs bg-background border-border/50 focus-visible:ring-1"
                                />
                            </div>

                            <div className="flex items-center justify-between mt-2 px-3 py-3 border border-border/50 bg-background/50 rounded-lg w-full">
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                                    <Bot className="w-4 h-4" />
                                    Meu Agente de IA
                                </span>
                                <div
                                    className={`w-12 h-6 rounded-full relative transition-[background-color] duration-300 ease-in-out cursor-pointer flex-shrink-0 ${useIaAgent ? 'bg-[#1bc678]' : 'bg-slate-300'}`}
                                    onClick={() => handleToggleIaAgent(!useIaAgent)}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-transform duration-300 ease-in-out shadow-md ${useIaAgent ? 'translate-x-[26px]' : 'translate-x-[2px]'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isAddingNew && !activeLead && status === 'connected' && (
                <div className="p-3 border-b border-border bg-muted/10 animate-in slide-in-from-top-2">
                    <form onSubmit={handleCreateNewChat} className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase">Nova Conversa</h4>
                        <div>
                            <Input
                                placeholder="Nome do Contato (Opcional)"
                                className="h-8 text-xs"
                                value={newChatName}
                                onChange={(e) => setNewChatName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="h-8 text-xs rounded-md border border-input bg-background px-2 w-[100px]"
                                value={newChatDDI}
                                onChange={(e) => setNewChatDDI(e.target.value)}
                            >
                                {DDIS.map(d => (
                                    <option key={d.country + d.code} value={d.code}>{d.code} {d.country}</option>
                                ))}
                            </select>
                            <Input
                                placeholder="DDD"
                                className="h-8 text-xs w-[60px]"
                                maxLength={2}
                                value={newChatDDD}
                                onChange={(e) => setNewChatDDD(e.target.value.replace(/\D/g, ''))}
                                required
                            />
                            <Input
                                placeholder="Número"
                                className="h-8 text-xs flex-1"
                                value={newChatPhone}
                                onChange={(e) => setNewChatPhone(e.target.value.replace(/\D/g, ''))}
                                required
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button type="button" variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => setIsAddingNew(false)}>Cancelar</Button>
                            <Button type="submit" size="sm" className="h-8 flex-1 text-xs" disabled={!newChatDDD || !newChatPhone}>Chamar</Button>
                        </div>
                    </form>
                </div>
            )}

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full relative scroll-smooth">
                {status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                )}

                {status === 'disconnected' && !loadingAction && qrCode && (
                    <div className="flex flex-col items-center pt-10 px-4 space-y-4">
                        <div className="flex flex-col items-center gap-4">
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 border-4 border-white shadow-lg rounded-xl" />
                            <div className="text-center space-y-2">
                                <p className="text-sm font-medium animate-pulse">Aponte a câmera do WhatsApp para este código</p>
                                <p className="text-[11px] text-amber-600 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 max-w-[280px]">
                                    💡 Se demorar ou der erro, atualize o QR Code para garantir o funcionamento correto.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-2">
                            <input
                                type="checkbox"
                                id="ia-toggle-qr"
                                checked={useIaAgent}
                                onChange={(e) => handleToggleIaAgent(e.target.checked)}
                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary accent-primary cursor-pointer"
                            />
                            <label htmlFor="ia-toggle-qr" className="text-sm font-medium leading-none cursor-pointer">
                                Ligar Agente de IA
                            </label>
                        </div>

                        <Button onClick={connectInstance} variant="secondary" size="sm" className="w-full max-w-[200px] mt-2">
                            Atualizar QR Code
                        </Button>
                    </div>
                )}

                {status === 'disconnected' && !loadingAction && !qrCode && (
                    <div className="flex flex-col items-center pt-10 px-4 space-y-4">
                        <QrCode className="w-10 h-10 text-muted-foreground" />
                        <p className="text-sm text-center text-muted-foreground">O WhatsApp não está conectado.</p>


                        <Button onClick={connectInstance} className="w-full max-w-[200px]">Conectar agora</Button>
                    </div>
                )}

                {status === 'connected' && !activeLead && !isAddingNew && (() => {
                    const filteredLeads = leads.filter(l => !searchContactTerm.trim() || String(l.title || '').toLowerCase().includes(searchContactTerm.toLowerCase()) || String(l.phone || '').includes(searchContactTerm));
                    return (
                        <div className="flex flex-col">
                            {filteredLeads.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
                            ) : (
                                filteredLeads.map(lead => (
                                    <div key={lead.id}
                                        className="p-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer flex flex-col gap-1 transition-colors relative"
                                        onClick={() => {
                                            setActiveLead(lead);
                                            setUnreadCounts(prev => ({ ...prev, [lead.phone]: 0 }));
                                        }}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-medium text-sm text-foreground truncate">{lead.title}</div>
                                            {unreadCounts[lead.phone] && unreadCounts[lead.phone] > 0 ? (
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center">
                                                    {unreadCounts[lead.phone]}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    );
                })()}

                {status === 'connected' && activeLead && (
                    <div className="flex flex-col p-3 space-y-3 min-h-full">
                        {messages.length === 0 ? (
                            <div className="text-center text-xs text-muted-foreground py-4">Inicie a conversa...</div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] text-sm rounded-2xl px-3 py-2 ${msg.sender === 'me' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-muted-foreground rounded-tl-sm'
                                        }`}>
                                        {msg.media_url && msg.type === 'image' && (
                                            <img src={msg.media_url} alt="Media" className="max-w-[150px] rounded-lg mb-2" />
                                        )}
                                        {msg.media_url && (msg.type === 'audio' || msg.type === 'ptt') && (
                                            <audio src={msg.media_url} controls className="max-w-full h-8 mt-1 filter brightness-90 contrast-125" />
                                        )}
                                        {msg.message}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {
                status === 'connected' && activeLead && (
                    <div className="p-3 bg-muted/20 border-t border-border relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-4 mb-2 bg-background border border-border rounded-lg shadow-xl p-2 w-[220px] z-50">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-xs font-semibold text-muted-foreground">Emojis</span>
                                    <button onClick={() => setShowEmojiPicker(false)} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {EMOJIS.map(emoji => (
                                        <button
                                            type="button"
                                            key={emoji}
                                            className="hover:bg-accent rounded text-lg flex items-center justify-center p-1 transition-colors"
                                            onClick={() => {
                                                setInputText(prev => prev + emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={sendMessage} className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile className="w-5 h-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-5 h-5" />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*, .pdf, .doc, .docx"
                            />

                            <Input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                className="h-9 text-sm rounded-full flex-1"
                                placeholder="Mensagem..."
                            />
                            <Button type="submit" size="icon" className="w-9 h-9 rounded-full shrink-0 disabled:opacity-50" disabled={!inputText.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                )
            }

            <Dialog open={showDeleteChatConfirm} onOpenChange={setShowDeleteChatConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-orange-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Confirmar Limpeza de Mensagens
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja apagar todo o histórico de mensagens desta conversa? Os dados do contato continuarão no CRM, mas o histórico do chat será permanentemente perdido.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
                        <Button variant="outline" onClick={() => setShowDeleteChatConfirm(false)} disabled={loadingAction}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteChat} disabled={loadingAction} className="bg-orange-500 hover:bg-orange-600">
                            {loadingAction ? "Limpando..." : "Sim, limpar mensagens"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteClientConfirm} onOpenChange={setShowDeleteClientConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <UserMinus className="w-5 h-5" /> Confirmar Exclusão do Cliente
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja excluir as mensagens e remover permanentemente este cliente do CRM? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
                        <Button variant="outline" onClick={() => setShowDeleteClientConfirm(false)} disabled={loadingAction}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteClient} disabled={loadingAction}>
                            {loadingAction ? "Excluindo..." : "Sim, excluir cliente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <LogOut className="w-5 h-5" /> Confirmar Desconexão
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja desconectar e fechar a sessão atual do WhatsApp na plataforma? Você precisará ler um novo QR Code caso queira se conectar novamente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
                        <Button variant="outline" onClick={() => setShowLogoutConfirm(false)} disabled={loadingAction}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmLogout} disabled={loadingAction}>
                            {loadingAction ? "Desconectando..." : "Sim, desconectar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {showLockModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-2xl w-full max-w-[320px] animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <BotOff className="w-5 h-5" />
                            <h3 className="font-bold">Travar Agente IA</h3>
                        </div>

                        <p className="text-xs text-muted-foreground mb-4">
                            O agente irá parar de responder automaticamente para todas as suas conversas pelo tempo selecionado.
                        </p>

                        <div className="flex gap-2 mb-6">
                            <Input
                                type="number"
                                min="1"
                                value={lockDuration}
                                onChange={(e) => setLockDuration(Number(e.target.value))}
                                className="flex-1 h-9 text-sm"
                            />
                            <select
                                value={lockUnit}
                                onChange={(e) => setLockUnit(e.target.value as any)}
                                className="bg-background border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                                <option value="min">Minutos</option>
                                <option value="hour">Horas</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 font-semibold">
                            <Button variant="ghost" size="sm" onClick={() => setShowLockModal(false)} className="text-xs">Cancelar</Button>
                            {isLocked ? (
                                <Button onClick={() => handleLockAgent(true)} className="bg-green-500 hover:bg-green-600 text-white text-xs h-9">Destravar Agora</Button>
                            ) : (
                                <Button onClick={() => handleLockAgent(false)} className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-9">Travar Agora</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
