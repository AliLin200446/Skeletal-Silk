export default function LeftPanel() {
  const s = {
    fontFamily: 'var(--font)',
    letterSpacing: '0.12em',
  }

  return (
    <div style={{
      ...s,
      position:'absolute', top:0, left:0,
      width:196, height:'100%',
      background:'rgba(6,6,6,0.72)',
      backdropFilter:'blur(24px) saturate(160%)',
      WebkitBackdropFilter:'blur(24px) saturate(160%)',
      borderRight:'0.5px solid rgba(255,255,255,0.15)',
      zIndex:10,
      display:'flex',
      flexDirection:'column',
    }}>

      {/* Title — fixed top left */}
      <div style={{padding:'22px 16px 18px', borderBottom:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{fontSize:11,fontWeight:500,letterSpacing:'0.24em',color:'#fff',lineHeight:1}}>
          SKELETAL SILK
        </div>
        <div style={{marginTop:9,fontSize:11,letterSpacing:'0.02em',color:'rgba(255,255,255,0.55)',lineHeight:1.5}}>
          reads a fabric photo into four numbers that drive a material shader
        </div>
      </div>

      {/* Main content — flex grow, space-between */}
      <div style={{
        flex:1,
        display:'flex',
        flexDirection:'column',
        justifyContent:'space-between',
        padding:'0 16px',
      }}>

        {/* Concept */}
        <div style={{paddingTop:22}}>
          <div style={{fontSize:9,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:14}}>
            WHAT IT DOES
          </div>
          <div style={{fontSize:11,letterSpacing:'0.03em',color:'rgba(255,255,255,0.62)',lineHeight:1.7}}>
            Photograph a material. Claude Vision returns four numbers that
            drive — and export — a GLSL shader.
          </div>
        </div>

        {/* System */}
        <div style={{paddingTop:22}}>
          <div style={{fontSize:9,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:16}}>
            SYSTEM
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:11}}>
            {[
              ['01', 'INPUT',    'photo, swatch, or text'],
              ['02', 'READ',     '4 constrained numbers, not prose'],
              ['03', 'DRIVE',    'each wired to a named uniform'],
              ['04', 'EXPORT',   'shader plus its parameters'],
            ].map(([n, label, desc]) => (
              <div key={n} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',flexShrink:0,marginTop:1,width:14}}>{n}</div>
                <div>
                  <div style={{fontSize:9,letterSpacing:'0.16em',color:'rgba(255,255,255,0.55)',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:10,letterSpacing:'0.02em',color:'rgba(255,255,255,0.55)',lineHeight:1.55}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction */}
        <div style={{paddingTop:22}}>
          <div style={{fontSize:9,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:16}}>
            INTERACTION
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              ['DRAG',    'Orbit mesh'],
              ['SCROLL',  'Zoom'],
              ['MOUSE',   'Bend surface'],
              ['SLIDERS', 'Live GLSL uniforms'],
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:9,letterSpacing:'0.14em',color:'rgba(255,255,255,0.5)'}}>{k}</span>
                <span style={{fontSize:9,letterSpacing:'0.06em',color:'rgba(255,255,255,0.28)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit */}
        <div style={{paddingTop:22,paddingBottom:28}}>
          <div style={{fontSize:9,letterSpacing:'0.14em',color:'rgba(255,255,255,0.45)',lineHeight:1.8}}>
            ALI LIN · NYU IMA 2026<br/>
            ALILINLAB.COM
          </div>
        </div>

      </div>
    </div>
  )
}
