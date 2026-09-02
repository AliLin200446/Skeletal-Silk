// Four tiers, floor 11px, matching the tokens in App.css. Written out here
// rather than referenced because this panel is styled inline; the values must
// stay in step with :root by hand until it moves to classes.
//
// HEAD and BODY are the same size and differ by weight, which is the whole
// distinction between a heading and the sentence under it at this scale.
const HEAD = { fontSize: 13, fontWeight: 500, letterSpacing: '0.12em' }
const BODY = { fontSize: 13, fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.6 }
const LABEL = { fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }

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

      {/* Title — fixed top left.
          Still at the label size while every other tier moved. SKELETAL SILK
          at the 24px title tier needs 263px of line and this column gives 164,
          so it cannot be the page title where it currently stands. Giving it
          14px, the largest that fits here, would answer a layout question with
          a number and make the column easier to leave alone later. It holds at
          11px so the mismatch stays visible. */}
      <div style={{padding:'18px 16px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{fontSize:11,fontWeight:500,letterSpacing:'0.24em',color:'#fff',lineHeight:1}}>
          SKELETAL SILK
        </div>
        {/* A one-line summary sat here, and WHAT IT DOES below is the same
            sentence with three more facts in it: who reads the photo, that you
            can carry the result away, and which shader. The subset went. The
            title now runs straight into the fuller sentence instead of into a
            shorter draft of it. */}
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
        <div style={{paddingTop:15}}>
          <div style={{...HEAD,color:'rgba(255,255,255,0.55)',marginBottom:9}}>
            WHAT IT DOES
          </div>
          <div style={{...BODY,color:'rgba(255,255,255,0.7)',lineHeight:1.7}}>
            Photograph a material. Claude Vision returns four numbers that
            drive — and export — a GLSL shader.
          </div>
        </div>

        {/* System */}
        <div style={{paddingTop:15}}>
          <div style={{...HEAD,color:'rgba(255,255,255,0.55)',marginBottom:10}}>
            SYSTEM
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              ['01', 'INPUT',    'photo, swatch, or text'],
              ['02', 'READ',     '4 constrained numbers, not prose'],
              ['03', 'DRIVE',    'each wired to a named uniform'],
              ['04', 'EXPORT',   'shader plus its parameters'],
            ].map(([n, label, desc]) => (
              <div key={n} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                {/* The ordinals stay at 1.5:1. They are position, not
                    information: reading 03 tells you nothing the order does
                    not already say. */}
                <div style={{...LABEL,color:'rgba(255,255,255,0.18)',flexShrink:0,marginTop:2,width:18}}>{n}</div>
                <div style={{minWidth:0}}>
                  <div style={{...LABEL,letterSpacing:'0.12em',color:'rgba(255,255,255,0.62)',marginBottom:3}}>{label}</div>
                  <div style={{...BODY,color:'rgba(255,255,255,0.62)',lineHeight:1.55}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction */}
        <div style={{paddingTop:15}}>
          <div style={{...HEAD,color:'rgba(255,255,255,0.55)',marginBottom:10}}>
            INTERACTION
          </div>
          {/* One list, and it is the first complete one. There were two: this
              column had DRAG, SCROLL, MOUSE and SLIDERS, the panel had CLICK,
              SHIFT/CMD, DRAG, SLIDERS and CMD-Z. Two entries appeared in both
              and neither list held everything, so the only way to learn what
              the interface does was to add them together, and nothing said to.
              See NOTES: a feature written twice by the same person is a sign
              the two halves were never read together.

              Order is the order a user meets them: look at the sample, pick a
              layer, change a number, undo it. */}
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {[
              ['DRAG',    'Orbit mesh'],
              ['SCROLL',  'Zoom'],
              ['MOUSE',   'Bend surface'],
              ['CLICK',   'Select layer'],
              // "SHIFT / CMD" and "Multi-select" together overrun 164px, and
              // the modifier is the half that has to stay exact.
              ['SHIFT',   'Multi-select'],
              // "Live GLSL uniforms" needs 119px beside a 57px key in a 164px
              // column. Dropping the word that was doing least is the smaller
              // change; the alternative is stacking the pair, which is layout.
              ['SLIDERS', 'GLSL uniforms'],
              ['CMD Z',   'Undo, redo'],
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',gap:8}}>
                <span style={{...LABEL,letterSpacing:'0.1em',color:'rgba(255,255,255,0.62)'}}>{k}</span>
                {/* Was 2.2:1, the worst contrast on the page, on the text that
                    says what each gesture does. */}
                <span style={{...LABEL,fontWeight:400,letterSpacing:'0.02em',color:'rgba(255,255,255,0.55)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit */}
        <div style={{paddingTop:15,paddingBottom:18}}>
          <div style={{...LABEL,letterSpacing:'0.1em',color:'rgba(255,255,255,0.5)',lineHeight:1.8}}>
            ALI LIN · NYU IMA 2026<br/>
            ALILINLAB.COM
          </div>
        </div>

      </div>
    </div>
  )
}
