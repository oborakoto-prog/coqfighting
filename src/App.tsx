import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import FBPlayer from './components/FBPlayer';
import { Wallet, LogOut, Swords, Send, User, Activity, Coins, Mail, Lock, Phone, ArrowRight, ArrowLeft, ShieldCheck, Zap, Trophy, Clock, CheckCircle2, History } from 'lucide-react';
import './App.css';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  balance: number;
}

interface Live {
  id: string;
  title: string;
  fb_url: string;
  team_a: string;
  team_b: string;
  status: string;
  winner?: string;
  custom_top?: string;
  custom_zoom?: string;
  created_at?: string;
}

interface BetRequest {
  id: string;
  user_id: string;
  opponent_id: string;
  profiles: { full_name: string };
  side: string;
  amount: number;
  target_amount: number;
  bet_type: string;
  status: string;
  live_id: string;
  lives: { team_a: string; team_b: string; winner?: string };
}

const BET_TYPES = [
  // SAHALA (Égalité)
  { label: '2/2', mult: 1, cat: 'SAHALA', desc: 'Égalité' },
  
  // MIAKATRA (L'adversaire met moins)
  { label: '3/2', mult: 1.5, cat: 'MIAKATRA', desc: 'X 1.5' },
  { label: '2/1', mult: 2, cat: 'MIAKATRA', desc: 'Double' },
  { label: '3/1', mult: 3, cat: 'MIAKATRA', desc: 'Triple' },
  { label: '4/1', mult: 4, cat: 'MIAKATRA', desc: 'X 4' },
  { label: '5/1', mult: 5, cat: 'MIAKATRA', desc: 'X 5' },
  { label: '10/1', mult: 10, cat: 'MIAKATRA', desc: 'X 10' },
  { label: '20/1', mult: 20, cat: 'MIAKATRA', desc: 'X 20' },

  // MIDINA (L'adversaire met plus)
  { label: '2/3', mult: 0.666, cat: 'MIDINA', desc: '1/1.5' },
  { label: '1/2', mult: 0.5, cat: 'MIDINA', desc: 'Inverse 2/1' },
  { label: '1/3', mult: 0.333, cat: 'MIDINA', desc: 'Inverse 3/1' },
  { label: '1/4', mult: 0.25, cat: 'MIDINA', desc: 'Inverse 4/1' },
  { label: '1/5', mult: 0.2, cat: 'MIDINA', desc: 'Inverse 5/1' },
  { label: '1/10', mult: 0.1, cat: 'MIDINA', desc: 'Inverse 10/1' },
  { label: '1/20', mult: 0.05, cat: 'MIDINA', desc: 'Inverse 20/1' },
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lives, setLives] = useState<Live[]>([]);
  const [finishedLives, setFinishedLives] = useState<Live[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<BetRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'my-requests' | 'my-bets'>('open');
  const [view, setView] = useState<'home' | 'login' | 'register' | 'deposit' | 'arena' | 'admin' | 'results' | 'leaderboard'>('home');
  
  // États Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // États Arène
  const [selectedLive, setSelectedLive] = useState<string | null>(null);
  const [betSide, setBetSide] = useState<'meron' | 'wala'>('meron');
  const [betAmount, setBetAmount] = useState<number>(5000);
  const [selectedType, setSelectedType] = useState(BET_TYPES[0]);

  // États Admin
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [adminTab, setAdminTab] = useState<'lives' | 'users'>('lives');
  const [editingLive, setEditingLive] = useState<Live | null>(null);
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveUrl, setNewLiveUrl] = useState('');
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newCustomTop, setNewCustomTop] = useState('0%');
  const [newCustomZoom, setNewCustomZoom] = useState('100%');

  const startEditing = (live: Live) => {
    setEditingLive(live);
    setNewLiveTitle(live.title);
    setNewLiveUrl(live.fb_url);
    setNewTeamA(live.team_a);
    setNewTeamB(live.team_b);
    setNewCustomTop(live.custom_top || '0%');
    setNewCustomZoom(live.custom_zoom || '100%');
    setView('admin');
  };

  const fetchAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    if (data) setAllProfiles(data);
  };

  const updateUserBalance = async (userId: string, newBalance: number) => {
    const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
    if (error) alert(error.message);
    else {
      alert("Solde mis à jour !");
      fetchAllProfiles();
      fetchLeaderboard();
      if (user && user.id === userId) fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        if (session.user.email === 'razafimandimbyzo618@gmail.com') {
          fetchAllProfiles();
        }
        setView('arena');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        if (session.user.email === 'razafimandimbyzo618@gmail.com') {
          fetchAllProfiles();
        }
        setView('arena');
      } else {
        setProfile(null);
        setView('home');
      }
    });

    fetchLives();
    fetchFinishedLives();
    fetchLeaderboard();
    fetchRequests();

    const channel = supabase.channel('arena-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, () => { fetchLives(); fetchFinishedLives(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { 
        if(user) fetchProfile(user.id); 
        fetchLeaderboard();
        if (user?.email === 'razafimandimbyzo618@gmail.com') fetchAllProfiles();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
  };

  const fetchLives = async () => {
    const { data } = await supabase.from('lives').select('*').eq('status', 'active');
    if (data) setLives(data);
  };

  const fetchFinishedLives = async () => {
    const { data } = await supabase.from('lives').select('id, title, fb_url, team_a, team_b, status, custom_top, custom_zoom, created_at').eq('status', 'finished').order('created_at', { ascending: false }).limit(20);
    if (data) setFinishedLives(data);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('profiles').select('*').order('balance', { ascending: false }).limit(20);
    if (data) setLeaderboard(data);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        profiles:user_id (full_name),
        lives:live_id (team_a, team_b)
      `)
      .in('status', ['pending', 'accepted', 'settled'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erreur de récupération des défis:", error);
    } else if (data) {
      setRequests(data as any);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, mobile_money_number: mobileNumber } }
    });
    if (error) alert(error.message);
    else if (data.user) {
      alert("Inscription réussie !");
      setView('arena');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setView('arena');
    setLoading(false);
  };

  const sendBetRequest = async () => {
    if (!user || !selectedLive || !profile) return;
    if (profile.balance < betAmount) { alert("Solde insuffisant !"); return; }

    const targetAmount = Math.floor(betAmount / selectedType.mult);
    const { error } = await supabase.from('bets').insert([{
      user_id: user.id,
      live_id: selectedLive,
      side: betSide,
      amount: betAmount,
      target_amount: targetAmount,
      bet_type: selectedType.label,
      status: 'pending'
    }]);

    if (error) alert(error.message);
    else {
      await supabase.from('profiles').update({ balance: profile.balance - betAmount }).eq('id', user.id);
      fetchProfile(user.id);
      alert("Défi envoyé !");
      setSelectedLive(null);
      setActiveTab('my-requests');
    }
  };

  const acceptBet = async (req: BetRequest) => {
    if (!user || !profile) return;
    if (profile.balance < req.target_amount) { alert("Solde insuffisant !"); return; }

    const { error } = await supabase.from('bets')
      .update({ status: 'accepted', opponent_id: user.id })
      .eq('id', req.id);

    if (error) alert(error.message);
    else {
      await supabase.from('profiles').update({ balance: profile.balance - req.target_amount }).eq('id', user.id);
      await fetchProfile(user.id);
      await fetchRequests();
      alert("Pari accepté et VERROUILLÉ !");
      setActiveTab('my-bets');
    }
  };

  const handleAddLive = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingLive) {
        // Mode Modification
        const { error } = await supabase.from('lives')
          .update({
            title: newLiveTitle,
            fb_url: newLiveUrl,
            team_a: newTeamA,
            team_b: newTeamB,
            custom_top: newCustomTop,
            custom_zoom: newCustomZoom
          })
          .eq('id', editingLive.id);
        if (error) throw error;
        alert("COMBAT MODIFIÉ AVEC SUCCÈS !");
      } else {
        // Mode Ajout (on désactive les autres d'abord)
        await supabase.from('lives').update({ status: 'inactive' }).eq('status', 'active');
        const { error } = await supabase.from('lives').insert([{
          title: newLiveTitle,
          fb_url: newLiveUrl,
          team_a: newTeamA,
          team_b: newTeamB,
          custom_top: newCustomTop,
          custom_zoom: newCustomZoom,
          status: 'active'
        }]);
        if (error) throw error;
        alert("COMBAT PUBLIÉ AVEC SUCCÈS !");
      }
      
      setEditingLive(null);
      setNewLiveTitle('');
      setNewLiveUrl('');
      setNewTeamA('');
      setNewTeamB('');
      setNewCustomTop('0%');
      setNewCustomZoom('100%');
      fetchLives();
      setView('arena');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const finishLive = async (liveId: string, winner: 'meron' | 'wala' | 'draw') => {
    if (loading) return; // Empêche les clics multiples
    if (!confirm(`CONFIRMATION STRICTE : Vainqueur ${winner.toUpperCase()} ?`)) return;
    
    setLoading(true);
    try {
      // 1. Verrouiller le combat (Passer de active à finished d'un coup)
      // On ne procède que si le live est encore 'active' pour éviter de relancer la fonction deux fois
      const { data: currentLive } = await supabase.from('lives').select('status').eq('id', liveId).single();
      if (currentLive?.status !== 'active') {
        alert("Erreur : Ce combat est déjà clôturé ou n'existe plus.");
        return;
      }

      // 1. Marquer comme terminé dans la DB
      const { error: updateError } = await supabase.from('lives').update({ status: 'finished' }).eq('id', liveId);
      if (updateError) throw updateError;

      // 2. Mettre à jour l'interface LOCALEMENT immédiatement (Disparition visuelle)
      setLives(prev => prev.filter(l => l.id !== liveId));

      // 3. Traiter les paris ACCEPTÉS
      const { data: bets } = await supabase.from('bets')
        .select('*')
        .eq('live_id', liveId)
        .eq('status', 'accepted');

      if (bets) {
        for (const bet of bets) {
          const { data: lockedBet } = await supabase.from('bets')
            .update({ status: 'settled' })
            .eq('id', bet.id)
            .eq('status', 'accepted')
            .select();

          if (lockedBet && lockedBet.length > 0) {
            if (winner === 'draw') {
              await supabase.rpc('increment_balance', { user_id: bet.user_id, amount: bet.amount });
              await supabase.rpc('increment_balance', { user_id: bet.opponent_id, amount: bet.target_amount });
            } else {
              const winnerId = (bet.side === winner) ? bet.user_id : bet.opponent_id;
              await supabase.rpc('increment_balance', { user_id: winnerId, amount: bet.amount + bet.target_amount });
            }
          }
        }
      }

      // 4. Rembourser les paris en ATTENTE
      const { data: pending } = await supabase.from('bets')
        .select('*')
        .eq('live_id', liveId)
        .eq('status', 'pending');

      if (pending) {
        for (const bet of pending) {
          const { data: cancelledBet } = await supabase.from('bets')
            .update({ status: 'cancelled' })
            .eq('id', bet.id)
            .eq('status', 'pending')
            .select();

          if (cancelledBet && cancelledBet.length > 0) {
            await supabase.rpc('increment_balance', { user_id: bet.user_id, amount: bet.amount });
          }
        }
      }

      // 5. Rafraîchir tout
      await Promise.all([
        fetchLives(),
        fetchFinishedLives(),
        fetchLeaderboard(),
        fetchAllProfiles()
      ]);
      
      alert(`COMBAT CLÔTURÉ : Vainqueur ${winner.toUpperCase()}. Gains distribués.`);
      setView('results');
    } catch (err: any) {
      alert("Erreur Critique : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAdmin = () => (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="auth-header">
          <h2>PANNEAU D'ADMINISTRATION</h2>
          <p>Gérez les combats et les comptes des joueurs.</p>
        </div>

        <div className="tabs-header" style={{ marginBottom: '20px' }}>
          <button className={`tab-btn ${adminTab === 'lives' ? 'active' : ''}`} onClick={() => setAdminTab('lives')}>
            <Activity size={18} /> GESTION COMBATS
          </button>
          <button className={`tab-btn ${adminTab === 'users' ? 'active' : ''}`} onClick={() => setAdminTab('users')}>
            <User size={18} /> COMPTES CLIENTS
          </button>
        </div>
        
        {adminTab === 'lives' ? (
          <>
            {/* Section Clôture de Combat */}
            {!editingLive && lives.length > 0 && (
              <div className="admin-actions-box" style={{ marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,71,87,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', animation: 'blink 1s infinite' }}></div>
                  <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.1rem', textTransform: 'uppercase' }}>COMBATS EN DIRECT ({lives.length})</h3>
                </div>
                
                <div className="lives-admin-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                  {lives.map(live => (
                    <div key={live.id} className="live-admin-item" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr auto', 
                      gap: '15px', 
                      alignItems: 'center', 
                      background: 'rgba(0,0,0,0.4)', 
                      padding: '20px', 
                      borderRadius: '16px', 
                      marginBottom: '12px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: '0.3s'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>ID: {live.id.slice(0,8)}</div>
                        <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '8px' }}>{live.title}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--meron)', fontWeight: 700 }}>{live.team_a}</span>
                          <span style={{ opacity: 0.3, fontWeight: 900 }}>VS</span>
                          <span style={{ color: 'var(--wala)', fontWeight: 700 }}>{live.team_b}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-accept-lite" 
                            style={{ background: 'var(--meron)', padding: '10px 15px', flex: 1, minWidth: '80px' }} 
                            onClick={() => finishLive(live.id, 'meron')}
                            disabled={loading}
                          >
                            MÉRON
                          </button>
                          <button 
                            className="btn-accept-lite" 
                            style={{ background: 'var(--wala)', padding: '10px 15px', flex: 1, minWidth: '80px' }} 
                            onClick={() => finishLive(live.id, 'wala')}
                            disabled={loading}
                          >
                            WALA
                          </button>
                        </div>
                        <button 
                          className="btn-accept-lite" 
                          style={{ background: 'var(--accent)', color: 'black', padding: '10px', width: '100%' }} 
                          onClick={() => finishLive(live.id, 'draw')}
                          disabled={loading}
                        >
                          ÉGALITÉ / ANNULER
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textAlign: 'center', marginTop: '10px' }}>
                  Cliquez sur un vainqueur pour clôturer et distribuer les gains automatiquement.
                </div>
              </div>
            )}

            <form className="auth-form" onSubmit={handleAddLive}>
              <div className="form-group">
                <label>Titre du Combat</label>
                <input type="text" className="auth-input" placeholder="Ex: Grand Combat Sabong" required value={newLiveTitle} onChange={e => setNewLiveTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>URL Facebook (Live / Vidéo / Reel)</label>
                <input type="text" className="auth-input" placeholder="https://www.facebook.com/..." required value={newLiveUrl} onChange={e => setNewLiveUrl(e.target.value)} />
              </div>
              <div className="matchup-row-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Team A (MÉRON)</label>
                  <input type="text" className="auth-input" placeholder="Coq Rouge" required value={newTeamA} onChange={e => setNewTeamA(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Team B (WALA)</label>
                  <input type="text" className="auth-input" placeholder="Coq Noir" required value={newTeamB} onChange={e => setNewTeamB(e.target.value)} />
                </div>
              </div>

              <div className="matchup-row-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Décalage Haut (ex: -30%)</label>
                  <input type="text" className="auth-input" placeholder="0%" value={newCustomTop} onChange={e => setNewCustomTop(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Zoom (ex: 150%)</label>
                  <input type="text" className="auth-input" placeholder="100%" value={newCustomZoom} onChange={e => setNewCustomZoom(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn-send-super" disabled={loading}>
                {loading ? 'PUBLICATION...' : editingLive ? 'MODIFIER LE COMBAT' : 'PUBLIER LE NOUVEAU COMBAT'}
              </button>
            </form>
          </>
        ) : (
          <div className="user-management-section">
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                className="auth-input" 
                placeholder="Rechercher un client (Nom ou Email)..." 
                value={searchUser} 
                onChange={e => setSearchUser(e.target.value)} 
              />
            </div>
            <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px' }}>
              {allProfiles
                .filter(p => 
                  p.full_name?.toLowerCase().includes(searchUser.toLowerCase()) || 
                  p.username?.toLowerCase().includes(searchUser.toLowerCase())
                )
                .map(p => (
                  <div key={p.id} className="user-admin-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Solde actuel: <span style={{ color: 'var(--success)', fontWeight: 800 }}>{p.balance.toLocaleString()} FTSY</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn-accept-lite" 
                        style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          const amt = prompt(`Ajouter au solde de ${p.full_name} (FTSY):`, "1000");
                          if (amt) updateUserBalance(p.id, p.balance + Number(amt));
                        }}
                      >
                        + AJOUTER
                      </button>
                      <button 
                        className="btn-accept-lite" 
                        style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--meron)' }}
                        onClick={() => {
                          const amt = prompt(`Retirer du solde de ${p.full_name} (FTSY):`, "1000");
                          if (amt) updateUserBalance(p.id, p.balance - Number(amt));
                        }}
                      >
                        - RETIRER
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        <button type="button" onClick={() => { setEditingLive(null); setView('arena'); }} className="btn-select" style={{ width: '100%', border: 'none', background: 'transparent', marginTop: '20px' }}>RETOUR À L'ARÈNE</button>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="auth-header">
          <div className="icon-circle" style={{ margin: '0 auto 15px', background: 'var(--accent)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={32} color="black" /></div>
          <h2>CLASSEMENT DES CHAMPIONS</h2>
          <p>Les joueurs les plus riches de l'Arena</p>
        </div>
        <div className="leaderboard-list">
          {leaderboard.map((prof, index) => (
            <div key={prof.id} className="leader-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: index === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '10px', borderLeft: index < 3 ? `4px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32'}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', minWidth: '30px', color: index < 3 ? 'var(--accent)' : 'inherit' }}>#{index + 1}</span>
                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{prof.full_name?.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{prof.full_name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Membre de l'Arena</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>{prof.balance.toLocaleString()} FTSY</div>
                <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>SOLDE TOTAL</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setView('arena')} className="btn-send-super" style={{ marginTop: '20px' }}>RETOUR À L'ARÈNE</button>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="auth-header">
          <h2>RÉSULTATS DES COMBATS</h2>
          <p>Historique des derniers combats terminés</p>
        </div>
        <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {finishedLives.length > 0 ? finishedLives.map(live => (
            <div key={live.id} className="lobby-card finished" style={{ opacity: 0.9 }}>
              <div className="card-header" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{live.title}</span>
                <span className="live-indicator" style={{ background: 'var(--text-muted)' }}>TERMINÉ</span>
              </div>
              <div className="matchup-row" style={{ padding: '30px 15px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div className={`team-txt ${live.winner === 'meron' ? 'winner-glow' : ''}`} style={{ color: 'var(--meron)', fontSize: '1.2rem' }}>{live.team_a}</div>
                  {live.winner === 'meron' && <div className="winner-badge">GAGNANT</div>}
                </div>
                <span className="vs-label">VS</span>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div className={`team-txt ${live.winner === 'wala' ? 'winner-glow' : ''}`} style={{ color: 'var(--wala)', fontSize: '1.2rem' }}>{live.team_b}</div>
                  {live.winner === 'wala' && <div className="winner-badge">GAGNANT</div>}
                </div>
              </div>
              {live.winner === 'draw' && <div style={{ textAlign: 'center', paddingBottom: '15px', color: 'var(--accent)', fontWeight: 800 }}>ÉGALITÉ / ANNULÉ</div>}
            </div>
          )) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', opacity: 0.3 }}>
              <Clock size={48} style={{ marginBottom: '15px' }} />
              <h3>AUCUN RÉSULTAT POUR LE MOMENT</h3>
            </div>
          )}
        </div>
        <button onClick={() => setView('arena')} className="btn-send-super" style={{ marginTop: '20px' }}>RETOUR À L'ARÈNE</button>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div className="landing-hero">
      <h1 className="hero-title">L'ARENA ULTIME<br/>DES COMBATS</h1>
      <p className="hero-subtitle">Défiez d'autres joueurs en temps réel. Misez, combattez, et gagnez des FTSY.</p>
      <div className="hero-actions">
        <button onClick={() => setView('register')} className="btn-send-super" style={{ width: 'auto', padding: '18px 40px' }}>DÉMARRER MAINTENANT <ArrowRight size={20} /></button>
        <button onClick={() => setView('login')} className="btn-select" style={{ fontSize: '1rem', padding: '16px 40px' }}>SE CONNECTER</button>
      </div>
      <div className="features-grid">
        <div className="feature-card"><Zap size={32} /><h3>Instantané</h3><p>Défis en temps réel.</p></div>
        <div className="feature-card"><ShieldCheck size={32} /><h3>Sécurisé</h3><p>Transactions protégées.</p></div>
        <div className="feature-card"><Trophy size={32} /><h3>Récompenses</h3><p>Gagnez gros.</p></div>
      </div>
    </div>
  );

  const renderAuth = (type: 'login' | 'register') => (
    <div className="auth-wrapper">
      <div className="auth-card">
        <button 
          onClick={() => setView('home')} 
          className="btn-select" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '20px',
            background: 'transparent',
            border: 'none',
            padding: '0',
            opacity: 0.7
          }}
        >
          <ArrowLeft size={18} /> RETOUR
        </button>
        <div className="auth-header">
          <h2>{type === 'login' ? 'RETOUR DANS L\'ARENA' : 'REJOINDRE LE COMBAT'}</h2>
          <p>{type === 'login' ? 'Entrez vos accès' : 'Créez votre profil'}</p>
        </div>
        <form className="auth-form" onSubmit={type === 'login' ? handleLogin : handleRegister}>
          {type === 'register' && (
            <>
              <div className="form-group"><label>Nom Complet</label><input type="text" className="auth-input" placeholder="Jean Dupont" required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div className="form-group"><label>Mobile Money</label><input type="text" className="auth-input" placeholder="034 XX XXX XX" required value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} /></div>
            </>
          )}
          <div className="form-group"><label>Email</label><input type="email" className="auth-input" placeholder="votre@email.com" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="form-group"><label>Mot de passe</label><input type="password" title="password" className="auth-input" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" className="btn-send-super" disabled={loading}>{loading ? 'CHARGEMENT...' : type === 'login' ? 'SE CONNECTER' : 'S\'INSCRIRE'}</button>
        </form>
        <div className="auth-footer">{type === 'login' ? <span onClick={() => setView('register')} className="auth-link">Pas de compte ? S'inscrire</span> : <span onClick={() => setView('login')} className="auth-link">Déjà un compte ? Connexion</span>}</div>
      </div>
    </div>
  );

  const renderArena = () => (
    <main className="arena-grid">
      <section className="left-col">
        <h2 className="section-title"><Swords size={24} color="var(--primary)" /> Arènes en Direct</h2>
        <div className="lives-grid">
          {lives.length > 0 ? lives.map(live => (
            <div key={live.id} className={`lobby-card ${selectedLive === live.id ? 'active' : ''}`}>
              <div className="card-header">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="live-indicator">EN COURS</span>
                  <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600, marginTop: '2px' }}>{live.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {user?.email === 'razafimandimbyzo618@gmail.com' && (
                    <button className="btn-select" style={{ background: 'var(--accent)', color: 'black' }} onClick={() => startEditing(live)}>MODIFIER</button>
                  )}
                  <button className={`btn-select ${selectedLive === live.id ? 'active' : ''}`} onClick={() => setSelectedLive(live.id)}>
                    {selectedLive === live.id ? 'SÉLECTIONNÉ' : 'DÉFIER'}
                  </button>
                </div>
              </div>
              <FBPlayer 
                url={live.fb_url} 
                customTop={live.custom_top} 
                customZoom={live.custom_zoom} 
              />
              <div className="matchup-row"><span className="team-txt" style={{ color: 'var(--meron)' }}>{live.team_a}</span><span className="vs-label">VS</span><span className="team-txt" style={{ color: 'var(--wala)' }}>{live.team_b}</span></div>
            </div>
          )) : (
            <div className="no-lives-card">
              <Activity size={48} className="pulse-icon" />
              <h3>AUCUNE ARÈNE DISPONIBLE</h3>
              <p>Il n'y a pas de combat de coq en direct pour le moment.</p>
            </div>
          )}
        </div>
        {selectedLive && (
          <div className="creator-card">
            <h3>🚀 CONFIGURER DÉFI</h3>
            
            <div className="step-box">
              <label className="step-label">1. CHOISISSEZ VOTRE CAMP</label>
              <div className="side-row-lite">
                <button className={`side-pill meron ${betSide === 'meron' ? 'active' : ''}`} onClick={() => setBetSide('meron')}>MÉRON</button>
                <button className={`side-pill wala ${betSide === 'wala' ? 'active' : ''}`} onClick={() => setBetSide('wala')}>WALA</button>
              </div>
            </div>

            <div className="step-box">
              <label className="step-label">2. TYPE DE MULTIPLICATEUR</label>
              
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>SAHALA</span>
                <div className="type-grid-lite" style={{ gridTemplateColumns: 'repeat(1, 1fr)', marginTop: '5px' }}>
                  {BET_TYPES.filter(t => t.cat === 'SAHALA').map(t => (
                    <div key={t.label} className={`pill-type ${selectedType.label === t.label ? 'active' : ''}`} onClick={() => setSelectedType(t)}>
                      <span className="label">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)' }}>MIAKATRA (L'adversaire paye moins)</span>
                <div className="type-grid-lite" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '5px' }}>
                  {BET_TYPES.filter(t => t.cat === 'MIAKATRA').map(t => (
                    <div key={t.label} className={`pill-type ${selectedType.label === t.label ? 'active' : ''}`} onClick={() => setSelectedType(t)}>
                      <span className="label">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--wala)' }}>MIDINA (L'adversaire paye plus)</span>
                <div className="type-grid-lite" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '5px' }}>
                  {BET_TYPES.filter(t => t.cat === 'MIDINA').map(t => (
                    <div key={t.label} className={`pill-type ${selectedType.label === t.label ? 'active' : ''}`} onClick={() => setSelectedType(t)}>
                      <span className="label">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="step-box"><label className="step-label">3. VOTRE MISE (FTSY)</label><input type="number" className="input-amount-lite" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} /></div>
            
            <div className="summary-box-lite">
              <div className="sum-item"><span>VOUS</span><strong>{betAmount.toLocaleString()}</strong></div>
              <div className="vs-label">VS</div>
              <div className="sum-item"><span>ADVERSAIRE</span><strong>{Math.floor(betAmount / selectedType.mult).toLocaleString()}</strong></div>
            </div>
            <button className="btn-send-super" onClick={sendBetRequest}><Send size={20} /> PUBLIER LE DÉFI</button>
          </div>
        )}
      </section>

      <aside className="sidebar-lite">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`} onClick={() => setActiveTab('open')}><Swords size={18} />Défis<span>OUVERTS</span></button>
          <button className={`tab-btn ${activeTab === 'my-requests' ? 'active' : ''}`} onClick={() => setActiveTab('my-requests')}><Send size={18} />Mes<span>DEMANDES</span></button>
          <button className={`tab-btn ${activeTab === 'my-bets' ? 'active' : ''}`} onClick={() => setActiveTab('my-bets')}><ShieldCheck size={18} />Mes<span>COMBATS</span></button>
        </div>
        <div className="chal-scroll">
          {requests
            .filter(req => {
              if (activeTab === 'open') return req.status === 'pending' && req.user_id !== user?.id;
              if (activeTab === 'my-requests') return req.status === 'pending' && req.user_id === user?.id;
              if (activeTab === 'my-bets') return req.status === 'accepted' && (req.user_id === user?.id || req.opponent_id === user?.id);
              return false;
            })
            .map(req => (
              <div key={req.id} className="chal-card-lite">
                <div className="chal-row-1">
                  <div className="user-tag"><div style={{ width: '24px', height: '24px', background: req.status === 'accepted' ? 'var(--success)' : 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{req.profiles?.full_name?.charAt(0)}</div>{req.profiles?.full_name?.split(' ')[0]}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div className="type-badge">{req.bet_type}</div>
                    {req.status === 'pending' ? <Clock size={14} color="var(--accent)" title="En attente" /> : <CheckCircle2 size={14} color="var(--success)" title="Accepté" />}
                  </div>
                </div>
                <div className="match-tag">{req.lives?.team_a} VS {req.lives?.team_b}</div>
                <div className="chal-row-2">
                  <div className={`side-tag ${req.side}`}>{req.side}</div>
                  <div className="amt-tag"><div>Lui: <strong>{req.amount.toLocaleString()}</strong></div><div>Vous: <strong>{req.target_amount.toLocaleString()}</strong></div></div>
                </div>
                {activeTab === 'open' && <button className="btn-accept-lite" onClick={() => acceptBet(req)}>ACCEPTER LE DÉFI</button>}
                {req.status === 'accepted' && <div className="lock-badge"><Zap size={14} fill="currentColor" /> COMBAT VERROUILLÉ</div>}
              </div>
            ))}
          {requests.filter(req => {
            if (activeTab === 'open') return req.status === 'pending' && req.user_id !== user?.id;
            if (activeTab === 'my-requests') return req.status === 'pending' && req.user_id === user?.id;
            if (activeTab === 'my-bets') return req.status === 'accepted' && (req.user_id === user?.id || req.opponent_id === user?.id);
            return false;
          }).length === 0 && <div style={{ textAlign: 'center', marginTop: '60px', opacity: 0.3 }}><Activity size={40} /><p>Rien ici...</p></div>}
        </div>
      </aside>
    </main>
  );

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => setView('home')}>ARENA <span className="live-tag">LIVE</span></div>
          <div className="nav-right">
            {user ? (
              <>
                <div className="balance-box"><Coins size={18} /> {profile?.balance?.toLocaleString() || 0} FTSY</div>
                
                <button onClick={() => setView('leaderboard')} className="icon-btn" title="Classement">
                  <Trophy size={20} />
                </button>

                <button onClick={() => setView('results')} className="icon-btn" title="Résultats">
                  <History size={20} />
                </button>

                {/* Bouton Admin - UNIQUEMENT visible pour l'administrateur */}
                {user.email === 'razafimandimbyzo618@gmail.com' && (
                  <button onClick={() => setView('admin')} className="icon-btn" title="Admin - Gestion">
                    <Activity size={20} />
                  </button>
                )}

                <button onClick={() => setView('deposit')} className="icon-btn" title="Dépôt"><Wallet size={20} /></button>
                <button onClick={() => supabase.auth.signOut()} className="icon-btn" title="Déconnexion"><LogOut size={20} /></button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setView('login')} className="btn-select" style={{ border: 'none', background: 'transparent' }}>CONNEXION</button><button onClick={() => setView('register')} className="btn-send-super" style={{ padding: '10px 24px', width: 'auto' }}>S'INSCRIRE</button></div>
            )}
          </div>
        </div>
      </nav>
      {view === 'home' && renderLanding()}
      {view === 'login' && renderAuth('login')}
      {view === 'register' && renderAuth('register')}
      {view === 'arena' && renderArena()}
      {view === 'admin' && renderAdmin()}
      {view === 'leaderboard' && renderLeaderboard()}
      {view === 'results' && renderResults()}
      {view === 'deposit' && <div className="auth-wrapper">
<div className="auth-card" style={{ textAlign: 'center' }}><h2>💰 DÉPÔT FTSY</h2><p>Maintenance en cours.</p><button onClick={() => setView('arena')} className="btn-send-super" style={{ marginTop: '20px' }}>RETOUR</button></div></div>}
    </div>
  );
}

export default App;
