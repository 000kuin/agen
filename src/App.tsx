import { useEffect, useRef, useState } from 'react'
import './App.css'

// ── Live block number from RPC ─────────────────────────────────────────────────
function useLiveBlock() {
  const [block, setBlock] = useState<number | null>(null)
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await window.fetch('https://rpc.mainnet.chain.robinhood.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        })
        const data = await res.json()
        setBlock(parseInt(data.result, 16))
      } catch {}
    }
    fetch()
    const id = setInterval(fetch, 6000)
    return () => clearInterval(id)
  }, [])
  return block
}

function useCopyAddress(addr: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ── Agent network canvas (hero background only) ───────────────────────────────
function AgentCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf: number, t = 0
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const W = () => canvas.width, H = () => canvas.height

    type Node = { x:number;y:number;vx:number;vy:number;r:number;type:'hub'|'agent'|'micro';pulse:number;pspd:number;heat:number }
    const nodes: Node[] = Array.from({length:42},(_,i)=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      vx:(Math.random()-0.5)*0.15, vy:(Math.random()-0.5)*0.15,
      r:i<4?5:i<14?2.5:1.2,
      type:(i<4?'hub':i<14?'agent':'micro') as 'hub'|'agent'|'micro',
      pulse:Math.random()*Math.PI*2, pspd:0.015+Math.random()*0.02, heat:0,
    }))
    type Packet={from:number;to:number;progress:number;speed:number}
    const packets:Packet[]=[]
    const spawn=()=>{
      const from=Math.floor(Math.random()*nodes.length)
      let to=Math.floor(Math.random()*nodes.length)
      while(to===from)to=Math.floor(Math.random()*nodes.length)
      const dx=nodes[from].x-nodes[to].x,dy=nodes[from].y-nodes[to].y
      if(Math.sqrt(dx*dx+dy*dy)>360)return
      packets.push({from,to,progress:0,speed:0.005+Math.random()*0.005})
      nodes[from].heat=1
    }
    const draw=()=>{
      t++
      if(t%22===0)spawn()
      ctx.clearRect(0,0,W(),H())
      ctx.fillStyle='#020205'; ctx.fillRect(0,0,W(),H())
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y
        const d=Math.sqrt(dx*dx+dy*dy),max=nodes[i].type==='hub'||nodes[j].type==='hub'?280:170
        if(d<max){
          const a=(1-d/max)*0.07+(nodes[i].heat+nodes[j].heat)*0.08
          ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y)
          ctx.strokeStyle=`rgba(0,255,136,${a})`;ctx.lineWidth=0.5;ctx.stroke()
        }
      }
      for(let i=packets.length-1;i>=0;i--){
        const p=packets[i];p.progress+=p.speed
        if(p.progress>=1){packets.splice(i,1);continue}
        const e=p.progress<0.5?2*p.progress*p.progress:-1+(4-2*p.progress)*p.progress
        const nx=nodes[p.from].x+(nodes[p.to].x-nodes[p.from].x)*e
        const ny=nodes[p.from].y+(nodes[p.to].y-nodes[p.from].y)*e
        const g=ctx.createRadialGradient(nx,ny,0,nx,ny,10)
        g.addColorStop(0,'rgba(0,255,136,0.35)');g.addColorStop(1,'transparent')
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(nx,ny,10,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(nx,ny,2.5,0,Math.PI*2);ctx.fillStyle='#00ff88';ctx.fill()
      }
      for(const n of nodes){
        n.x+=n.vx;n.y+=n.vy
        if(n.x<-20)n.x=W()+20;if(n.x>W()+20)n.x=-20
        if(n.y<-20)n.y=H()+20;if(n.y>H()+20)n.y=-20
        n.pulse+=n.pspd;n.heat=Math.max(0,n.heat-0.008)
        const b=0.3+n.heat*0.7+Math.sin(n.pulse)*0.1
        if(n.type==='hub'){
          const h=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*12)
          h.addColorStop(0,`rgba(0,255,136,${0.1+n.heat*0.08})`);h.addColorStop(1,'transparent')
          ctx.fillStyle=h;ctx.beginPath();ctx.arc(n.x,n.y,n.r*12,0,Math.PI*2);ctx.fill()
          ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2)
          ctx.fillStyle=`rgba(0,255,136,${b})`;ctx.fill()
        } else if(n.type==='agent'){
          ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2)
          ctx.fillStyle=`rgba(0,255,136,${b*0.65})`;ctx.fill()
        } else {
          ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2)
          ctx.fillStyle=`rgba(255,255,255,${b*0.18})`;ctx.fill()
        }
      }
      raf=requestAnimationFrame(draw)
    }
    draw()
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)}
  },[])
  return <canvas id="bg" ref={ref} />
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.arch-panel,.step,.metric,.team-card,.cd-wrap,.finale,.how-header,.hr')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })
}



// ── Nav scroll state ──────────────────────────────────────────────────────────
function useScrolled() {
  const [s, setS] = useState(false)
  useEffect(() => {
    const fn = () => setS(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return s
}

// ── Feed ──────────────────────────────────────────────────────────────────────
const FEED_ITEMS = [
  {t:'SETTLEMENT',v:'AGENT_0x7f→0x3a',a:'12.4 $AGEN'},{t:'PROOF',v:'#8841092',a:'VERIFIED'},
  {t:'SETTLEMENT',v:'AGENT_0xb2→0x91',a:'7.1 $AGEN'},{t:'REGISTER',v:'0xd4…f2',a:'NODE'},
  {t:'SETTLEMENT',v:'AGENT_0x12→0xc7',a:'31.0 $AGEN'},{t:'BATCH',v:'#8841093',a:'SUBMITTED'},
  {t:'SETTLEMENT',v:'AGENT_0x55→0x08',a:'5.5 $AGEN'},{t:'TASK',v:'BLOCK 4419831',a:'SETTLED'},
]

// ── App ───────────────────────────────────────────────────────────────────────
const CA = 'TBA' // ← paste contract address here when ready

export default function App() {
  useReveal()
  const scrolled = useScrolled()
  const feed = [...FEED_ITEMS,...FEED_ITEMS]
  const block = useLiveBlock()
  const { copied, copy } = useCopyAddress(CA)

  return (
    <>
      {/* Nav */}
      <nav className={`nav${scrolled?' scrolled':''}`}>
        <div className="nav-logo"><span className="nav-dot"/>AGEN</div>
        <ul className="nav-links">
          <li><a href="#architecture">Protocol</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#token">Token</a></li>
          <li><a href="#/docs" onClick={(e) => { e.preventDefault(); window.location.hash = '/docs' }}>Docs</a></li>
        </ul>
        <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="nav-cta">Acquire $AGEN</a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <AgentCanvas />
        <div className="hero-content">
          <div className="hero-eyebrow">v0.1.0 — Robinhood Chain / EVM</div>
          <h1 className="hero-h1">AGEN</h1>
          <p className="hero-sub">
            The economic infrastructure layer enabling AI agents to autonomously acquire resources, settle tasks, and coordinate with other agents — entirely on-chain, with zero human involvement.
          </p>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="hero-stat-val live-green">LIVE</span>
              <span className="hero-stat-key">block {block ? block.toLocaleString() : '...'}</span>
            </div>
            <div className="hero-stat-sep"/>
            <div className="hero-stat">
              <span className="hero-stat-val">1,000,000,000</span>
              <span className="hero-stat-key">fixed supply</span>
            </div>
            <div className="hero-stat-sep"/>
            <div className="hero-stat">
              <span className="hero-stat-val">3%</span>
              <span className="hero-stat-key">buy / sell tax</span>
            </div>
          </div>
          <div className="hero-btns">
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="btn-primary">Acquire $AGEN</a>
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="btn-ghost">Read contract ↗</a>
          </div>
        </div>
        <div className="hero-feed">
          <div className="feed-track">
            {feed.map((item,i)=>(
              <span key={i} className="feed-item">
                <span>{item.t}</span>&nbsp;<span className="g">{item.v}</span>&nbsp;<span>{item.a}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Contract address — visible immediately */}
      <div className="ca-section ca-hero">
        <div className="ca-inner">
          <div className="ca-label">Contract Address</div>
          <div className="ca-row">
            <span className="ca-addr">{CA}</span>
            <button className="ca-copy" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
            <div className="ca-note">Deployed on Robinhood Chain (Chain ID: 4663). Verify on <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">Blockscout ↗</a></div>
        </div>
      </div>

      <div className="content">

        {/* Architecture panels */}
        <div className="arch" id="architecture">
          <div className="arch-inner">
            <div className="arch-panel">
              <div className="arch-label">001 / The Problem</div>
              <h2 className="arch-title">AI agents have no native payment rails.</h2>
              <p className="arch-body">
                Modern AI agents can browse the web, write code, and invoke APIs — but they cannot <strong>pay for anything</strong> without a human holding a credit card. Every autonomous workflow breaks the moment money needs to move. AGEN fixes this at the protocol level by giving agents a <strong>cryptographically-controlled economic identity</strong> with which they can transact directly with one another and with external services.
              </p>
            </div>
            <div className="arch-panel">
              <div className="arch-label">002 / The Solution</div>
              <h2 className="arch-title">Agent-native settlement in a single block.</h2>
              <p className="arch-body">
                When an agent completes a delegated task, the <code>AgentSettlement</code> contract verifies the completion proof and releases <code>$AGEN</code> to the fulfilling agent's wallet atomically. <strong>No intermediaries. No escrow period. No human approval.</strong> The entire cycle — request, execution, proof, payment — resolves within one block on Robinhood Chain.
              </p>
            </div>
            <div className="arch-panel">
              <div className="arch-label">003 / Agent Identity</div>
              <h2 className="arch-title">Every agent owns a sovereign on-chain wallet.</h2>
              <p className="arch-body">
                AGEN's <code>AgentRegistry</code> contract assigns each deployed agent a deterministic wallet address derived from its model hash and operator key. Agents sign transactions with this identity, creating a <strong>verifiable, immutable on-chain history</strong> of every economic action they have ever taken — auditable by anyone, controllable by no one.
              </p>
            </div>
            <div className="arch-panel">
              <div className="arch-label">004 / Demand Mechanics</div>
              <h2 className="arch-title">Every inference, every task — settled in $AGEN.</h2>
              <p className="arch-body">
                All agent-to-agent payments within the AGEN network are denominated in <code>$AGEN</code>. As the number of autonomous agents grows — across inference, data retrieval, code execution, and coordination — <strong>demand for $AGEN grows proportionally.</strong> The token is not speculative. It is operational fuel.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="how" id="how-it-works">
          <div className="how-header">
            <div className="section-label">Protocol Flow</div>
            <h2 className="section-title">How a task settles on AGEN</h2>
          </div>
          <div className="steps">
            {[
              {n:'01',title:'Agent A broadcasts a task request',body:'A requesting agent posts a signed task specification to the AGEN mempool. The spec includes the task type, required output format, deadline, and the $AGEN bid — the maximum the agent is willing to pay for completion.'},
              {n:'02',title:'Agent B accepts and executes',body:<>A fulfilling agent — identified by its <code>AgentRegistry</code> address — accepts the task, locks the bid in the <code>AgentSettlement</code> escrow, and begins execution. The fulfiller\'s stake is slashed if they fail to deliver within the deadline.</>},
              {n:'03',title:'Completion proof submitted on-chain',body:<>On task completion, the fulfilling agent submits a <strong>cryptographic completion proof</strong> — a hash of the output alongside the agent\'s signature — to the <code>AgentSettlement</code> contract. The contract verifies the proof deterministically.</>},
              {n:'04',title:'Payment releases in the same block',body:<>If the proof is valid, <code>$AGEN</code> transfers from escrow to the fulfilling agent within the same block. <strong>No human reviews it. No oracle delays it.</strong> The contract is the arbiter. Math is the authority.</>},
            ].map(step=>(
              <div className="step" key={step.n}>
                <div className="step-num">{step.n}</div>
                <div className="step-content">
                  <div className="step-title">{step.title}</div>
                  <div className="step-body">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hr" />

        {/* Token metrics */}
        <div className="metrics" id="token">
          <div className="metrics-inner">
            <div className="how-header">
              <div className="section-label">Token</div>
              <h2 className="section-title">$AGEN — fixed, functional, immutable</h2>
            </div>
            <div className="metrics-grid">
              {[
                {val:'1,000,000,000',key:'Total supply',note:'Fixed at genesis. No mint function exists in the contract. Supply is a mathematical constant.',g:false},
                {val:'3%',key:'Buy / sell tax',note:'3% on each transaction. Allocated to protocol operations, liquidity reinforcement, and long-term network sustainability.',g:false},
                {val:'EVM / 4663',key:'Network',note:'Deployed on Robinhood Chain. Compatible with all EVM tooling — MetaMask, Ethers.js, Hardhat, Foundry.',g:false},
                {val:'Immutable',key:'Core contract',note:'AgentSettlement — handles task escrow, proof verification, and atomic payment release. No admin keys.',g:false},
                {val:'Permissionless',key:'Agent identity',note:'AgentRegistry — assigns deterministic wallet addresses to agents from model hash + operator key.',g:false},
                {val:'Block-finality',key:'Settlement speed',note:'Payment releases in the same block as proof verification. No multi-block delays. No oracle latency.',g:false},
              ].map(m=>(
                <div className="metric" key={m.key}>
                  <div className={`metric-val${m.g?' g':''}`}>{m.val}</div>
                  <div className="metric-key">{m.key}</div>
                  <div className="metric-note">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Allocation bar */}
        <div className="alloc-section">
          <div className="alloc-inner">
            <div className="how-header">
              <div className="section-label">Distribution</div>
              <h2 className="section-title">Where the supply went</h2>
            </div>
            <div className="alloc-bar-wrap">
              <div className="alloc-bar">
                <div className="alloc-seg community" style={{width:'94%'}} />
                <div className="alloc-seg reserve" style={{width:'6%'}} />
              </div>
              <div className="alloc-legend">
                <div className="alloc-item">
                  <span className="alloc-dot community"/>
                  <span className="alloc-name">Community &amp; public</span>
                  <span className="alloc-pct">94%</span>
                  <span className="alloc-amt">940,000,000 $AGEN</span>
                </div>
                <div className="alloc-item">
                  <span className="alloc-dot reserve"/>
                  <span className="alloc-name">Protocol ops &amp; liquidity</span>
                  <span className="alloc-pct">6%</span>
                  <span className="alloc-amt">60,000,000 $AGEN</span>
                </div>
                <div className="alloc-item">
                  <span className="alloc-dot none"/>
                  <span className="alloc-name">Team / founders</span>
                  <span className="alloc-pct g">0%</span>
                  <span className="alloc-amt">0 $AGEN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="quote-section">
          <div className="quote-inner">
            <div className="quote-mark">"</div>
            <p className="quote-text">
              The most underpriced narrative in crypto right now is agent-to-agent economic coordination. When AI systems can transact without humans, the demand for a neutral settlement token becomes structural, not speculative.
            </p>
            <div className="quote-attr">— Anonymous researcher, distributed systems</div>
          </div>
        </div>

        <div className="hr" />

        {/* Team */}
        <div className="team">
          <div className="how-header">
            <div className="section-label">Contributors</div>
            <h2 className="section-title">Built pseudonymously. On purpose.</h2>
          </div>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.28)',lineHeight:'1.85',marginTop:'16px',maxWidth:'560px'}}>
            AGEN was designed by a group of researchers with backgrounds in multi-agent reinforcement learning, cryptographic protocol design, and distributed systems. All contributors operate under pseudonyms. <strong style={{color:'rgba(255,255,255,0.5)',fontWeight:600}}>This is a deliberate architectural choice, not an oversight.</strong>
          </p>
          <div className="team-grid" style={{marginTop:'36px'}}>
            {[
              {handle:'0xagent_r', role:'Protocol Architecture & AgentSettlement contract', init:'R'},
              {handle:'anon.eth', role:'AgentRegistry & agent identity layer', init:'A'},
              {handle:'_sigma9', role:'On-chain proof verification system', init:'Σ'},
              {handle:'ghost[0]', role:'Tokenomics, incentive design & demand mechanics', init:'G'},
            ].map(m=>(
              <div className="team-card" key={m.handle}>
                <div className="team-avatar" data-init={m.init}/>
                <div>
                  <div className="team-handle">{m.handle}</div>
                  <div className="team-role">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finale */}
        <div className="finale">
          <div className="finale-glow"/>
          <div className="finale-title">The agent<br/>economy<br/>is live.</div>
          <div className="finale-sub">the only question is whether you're in it</div>
          <div className="hero-btns">
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="btn-primary">Acquire $AGEN</a>
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="btn-ghost">View contract ↗</a>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-left">
            <div className="footer-logo">AGEN Protocol</div>
            <div className="footer-audit">
              <span className="audit-badge">MIT License</span>
              <span className="audit-badge">EVM Compatible</span>
            </div>
          </div>
          <ul className="footer-links">
            <li><a href="https://x.com" target="_blank" rel="noreferrer">Twitter</a></li>
            <li><a href="https://t.me" target="_blank" rel="noreferrer">Telegram</a></li>
            <li><a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">Contract ↗</a></li>
            <li><a href="#/docs" onClick={(e) => { e.preventDefault(); window.location.hash = '/docs' }}>Docs</a></li>
          </ul>
          <span className="footer-copy">© 2026 AGEN Protocol</span>
        </footer>

      </div>
    </>
  )
}
