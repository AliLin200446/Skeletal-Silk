export default function LeftPanel() {
  const s = {
    fontFamily: 'Helvetica Neue,Helvetica,Arial,sans-serif',
    letterSpacing: '0.12em',
  }

  return (
    <div style={{
      ...s,
      position:'absolute', top:0, left:0,
      width:220, height:'100%',
      background:'rgba(6,6,6,0.82)',
      backdropFilter:'blur(20px) saturate(180%)',
      WebkitBackdropFilter:'blur(20px) saturate(180%)',
      borderRight:'0.5px solid rgba(255,255,255,0.15)',
      zIndex:10,
      display:'flex',
      flexDirection:'column',
    }}>

      {/* Title — fixed top left */}
      <div style={{padding:'28px 20px 24px', borderBottom:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{fontSize:11,fontWeight:500,letterSpacing:'0.24em',color:'#fff',lineHeight:1}}>
          SKELETAL SILK
        </div>
        <div style={{marginTop:6,fontSize:7.5,letterSpacing:'0.16em',color:'rgba(255,255,255,0.35)'}}>
          BIOMATERIAL ENGINE · V1
        </div>
      </div>

      {/* Main content — flex grow, space-between */}
      <div style={{
        flex:1,
        display:'flex',
        flexDirection:'column',
        justifyContent:'space-between',
        padding:'0 20px',
      }}>

        {/* Concept */}
        <div style={{paddingTop:32}}>
          <div style={{fontSize:7.5,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:14}}>
            CONCEPT
          </div>
          <div style={{fontSize:8.5,letterSpacing:'0.04em',color:'rgba(255,255,255,0.6)',lineHeight:1.8}}>
            An AI-driven biomorphic textile engine. Upload a fabric — Claude Vision analyses material properties and maps them to GLSL shader uniforms, generating a living 3D form where silk grows bone structure in real time.
          </div>
        </div>

        {/* System */}
        <div style={{paddingTop:32}}>
          <div style={{fontSize:7.5,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:16}}>
            SYSTEM
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              ['01', 'INPUT',    'Upload fabric or describe material'],
              ['02', 'ANALYSE',  'Claude Vision → 4 material parameters'],
              ['03', 'RENDER',   'GLSL maps parameters to biomorphic form'],
              ['04', 'GENERATE', 'Fal.ai produces AI reference every 7s'],
              ['05', 'MORPH',    'Mesh interpolates last 3 material states'],
            ].map(([n, label, desc]) => (
              <div key={n} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{fontSize:7.5,color:'rgba(255,255,255,0.18)',flexShrink:0,marginTop:1,width:14}}>{n}</div>
                <div>
                  <div style={{fontSize:7.5,letterSpacing:'0.16em',color:'rgba(255,255,255,0.55)',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:8,letterSpacing:'0.03em',color:'rgba(255,255,255,0.3)',lineHeight:1.6}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction */}
        <div style={{paddingTop:32}}>
          <div style={{fontSize:7.5,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:16}}>
            INTERACTION
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              ['DRAG',    'Orbit mesh'],
              ['SCROLL',  'Zoom'],
              ['MOUSE',   'Bend surface'],
              ['SLIDERS', 'Live GLSL uniforms'],
              ['AI LOOP', 'Fal.ai generation cycle'],
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:7.5,letterSpacing:'0.14em',color:'rgba(255,255,255,0.5)'}}>{k}</span>
                <span style={{fontSize:7.5,letterSpacing:'0.06em',color:'rgba(255,255,255,0.28)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit */}
        <div style={{paddingTop:32,paddingBottom:28}}>
          <div style={{fontSize:7.5,letterSpacing:'0.14em',color:'rgba(255,255,255,0.2)',lineHeight:1.8}}>
            ALI LIN · NYU IMA 2026<br/>
            ALILINLAB.COM
          </div>
        </div>

      </div>
    </div>
  )
}
