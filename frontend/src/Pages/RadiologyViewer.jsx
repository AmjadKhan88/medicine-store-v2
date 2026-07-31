import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' }) : '—';

export default function RadiologyViewer() {
  const { token }     = useParams();
  const [study,  setStudy]  = useState(null);
  const [error,  setError]  = useState(null);
  const [loading,setLoading]= useState(true);
  const [activeImg,setActive]= useState(0);

  useEffect(() => {
    API.get(`/radiology/shared/${token}`)
      .then(({ data }) => setStudy(data.study))
      .catch(err => setError(err.response?.data?.message || 'Study not found'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ background:'#0f172a', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <ShortLoader text="Loading report..."/>
    </div>
  );

  if (error) return (
    <div style={{ background:'#0f172a', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', padding:24 }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🔗</div>
      <div style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Link Not Available</div>
      <div style={{ color:'rgba(255,255,255,0.5)', textAlign:'center' }}>{error}</div>
    </div>
  );

  const imgs    = study?.images || [];
  const imgUrl  = imgs[activeImg]?.url;
  const isPDF   = imgs[activeImg]?.mimetype === 'application/pdf';

  const MODALITY_ICONS = { 'X-Ray':'🩻', 'Ultrasound':'🔊', 'CT Scan':'🖥', 'MRI':'🧲', 'Echocardiography':'💓', 'Other':'📋' };
  const modalityIcon = MODALITY_ICONS[study?.modality] || '📋';

  return (
    <div style={{ background:'#0f172a', minHeight:'100vh', fontFamily:'system-ui,sans-serif', color:'#fff' }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'16px 32px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ fontSize:32 }}>{modalityIcon}</div>
        <div>
          <div style={{ fontWeight:800, fontSize:20 }}>{study?.modality} — {study?.studyType}</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>
            {study?.studyNumber} · {fmtDate(study?.studyDate)}
            {study?.bodyPart && ` · ${study.bodyPart}`}
            {study?.laterality !== 'N/A' && ` (${study.laterality})`}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: imgs.length > 0 ? '1fr 380px' : '1fr', minHeight:'calc(100vh - 65px)' }}>

        {/* Images panel */}
        {imgs.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column' }}>
            {/* Main image viewer */}
            <div style={{ flex:1, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, position:'relative' }}>
              {isPDF ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:64, marginBottom:16 }}>📄</div>
                  <a href={imgUrl} target="_blank" rel="noopener noreferrer"
                    style={{ background:'#0ea5e9', color:'#fff', padding:'12px 28px', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:15 }}>
                    Open PDF Report
                  </a>
                </div>
              ) : imgUrl ? (
                <img src={imgUrl} alt={imgs[activeImg]?.title || 'Radiology image'}
                  style={{ maxWidth:'100%', maxHeight:'70vh', objectFit:'contain' }} />
              ) : null}

              {/* Zoom hint */}
              {!isPDF && imgUrl && (
                <a href={imgUrl} target="_blank" rel="noopener noreferrer"
                  style={{ position:'absolute', bottom:12, right:12, background:'rgba(255,255,255,0.15)', color:'#fff', padding:'6px 14px', borderRadius:8, textDecoration:'none', fontSize:12 }}>
                  🔍 View Full Size
                </a>
              )}
            </div>

            {/* Image description */}
            {imgs[activeImg]?.title && (
              <div style={{ background:'rgba(255,255,255,0.05)', padding:'10px 20px', fontSize:13, color:'rgba(255,255,255,0.7)' }}>
                <strong>{imgs[activeImg].title}</strong>
                {imgs[activeImg].description && ` — ${imgs[activeImg].description}`}
              </div>
            )}

            {/* Thumbnail strip */}
            {imgs.length > 1 && (
              <div style={{ display:'flex', gap:8, padding:'12px 20px', overflowX:'auto', background:'rgba(0,0,0,0.4)' }}>
                {imgs.map((img, i) => (
                  <div key={i} onClick={() => setActive(i)}
                    style={{
                      width:70, height:70, borderRadius:8, overflow:'hidden', cursor:'pointer', flexShrink:0,
                      border:`2px solid ${activeImg===i?'#0ea5e9':'transparent'}`,
                      background:'rgba(255,255,255,0.05)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                    {img.mimetype === 'application/pdf' ? (
                      <div style={{ fontSize:24 }}>📄</div>
                    ) : (
                      <img src={img.url} alt={img.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Report panel */}
        <div style={{ borderLeft:imgs.length>0?'1px solid rgba(255,255,255,0.1)':'none', overflowY:'auto', padding:24 }}>
          {/* Patient */}
          <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Patient</div>
            <div style={{ fontWeight:700, fontSize:16 }}>{study?.patient?.name}</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginTop:3 }}>
              {study?.patient?.patientId} · Age {study?.patient?.age} · {study?.patient?.gender}
            </div>
          </div>

          {/* Clinical history */}
          {study?.clinicalHistory && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Clinical History</div>
              <div style={{ fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.8)' }}>{study.clinicalHistory}</div>
            </div>
          )}

          {/* Report */}
          {study?.report ? (
            <div>
              {/* Critical alert */}
              {study.report.isCritical && (
                <div style={{ background:'#7f1d1d', border:'1px solid #ef4444', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
                  <div style={{ fontWeight:800, color:'#ef4444', marginBottom:4 }}>🚨 CRITICAL FINDING</div>
                  <div style={{ fontSize:13, color:'#fca5a5' }}>{study.report.criticalAlert}</div>
                </div>
              )}

              {/* Normal / Abnormal badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ background: study.report.isNormal?'#166534':'#7f1d1d', color: study.report.isNormal?'#86efac':'#fca5a5', padding:'4px 14px', borderRadius:99, fontSize:12, fontWeight:700 }}>
                  {study.report.isNormal ? '✓ Normal' : '⚠ Abnormal'}
                </span>
              </div>

              {/* Report sections */}
              {[
                { title:'Technique',       value:study.report.technique      },
                { title:'Findings',        value:study.report.findings       },
                { title:'Impression',      value:study.report.impression     },
                { title:'Recommendation',  value:study.report.recommendation },
              ].filter(s => s.value).map(({ title, value }) => (
                <div key={title} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>{title}</div>
                  <div style={{ fontSize:14, lineHeight:1.8, color:'rgba(255,255,255,0.85)', whiteSpace:'pre-wrap', background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px' }}>
                    {value}
                  </div>
                </div>
              ))}

              {/* Radiologist */}
              {study.radiologist && (
                <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.1)', fontSize:13, color:'rgba(255,255,255,0.4)' }}>
                  Reported by: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{study.radiologist}</strong>
                  {study.reportDate && ` · ${fmtDate(study.reportDate)}`}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div>Report not yet available</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:'rgba(255,255,255,0.03)', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'12px 32px', display:'flex', justifyContent:'space-between', fontSize:12, color:'rgba(255,255,255,0.3)' }}>
        <span>MediStore Radiology — Secure Shared Report</span>
        <span>This link is read-only. For clinical use only.</span>
      </div>
    </div>
  );
}