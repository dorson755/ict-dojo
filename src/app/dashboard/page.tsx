import { redirect } from 'next/navigation';
import Link from 'next/link';
import { logout } from '../(auth)/actions';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';

export default async function DashboardPage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  // Fetch Profile
  const profile = await UserRepository.getProfile(user.id);

  if (!profile || !profile.grade_level) {
    redirect('/onboarding');
  }

  // Fetch DNA
  const dna = await UserRepository.getTypingDNA(user.id);

  // Fetch active recommendation
  const activeRec = await RecommendationRepository.getActiveRecommendation(user.id);

  // Fetch top mastered skills
  const masteredSkills = await MasteryRepository.getTopMasteredSkills(user.id, 5);

  // Fetch recent sessions
  const recentSessions = await ExerciseRepository.getRecentSessions(user.id, 5);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>ICT Dojo</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Grade {profile.grade_level} Student
          </span>
          <form action={logout}>
            <button type="submit" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
              Logout
            </button>
          </form>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Main Content Area */}
          <div>
            <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Next Up</h2>
              
              {activeRec ? (
                <div style={{ backgroundColor: '#eff6ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <h3 style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '0.5rem' }}>Target: {activeRec.skills?.name || 'Assigned Skill'}</h3>
                  <p style={{ color: '#1e3a8a', marginBottom: '1.5rem' }}>{activeRec.reason}</p>
                  
                  <Link href="/practice" style={{ display: 'inline-block', backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, textDecoration: 'none' }}>
                    Start Practice Session
                  </Link>
                </div>
              ) : (
                <div style={{ backgroundColor: '#f1f5f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#475569', marginBottom: '1.5rem' }}>You're all caught up! But there's always room to improve your speed.</p>
                  <Link href="/practice" style={{ display: 'inline-block', backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, textDecoration: 'none' }}>
                    Jump into the Dojo
                  </Link>
                </div>
              )}
            </section>

            <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Top Skills</h2>
              
              {masteredSkills && masteredSkills.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {masteredSkills.map((sm: any, i: number) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i !== masteredSkills.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      <span style={{ fontWeight: 500 }}>{sm.skills?.name || 'Skill'}</span>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '999px',
                          backgroundColor: sm.mastery_level === 'mastered' ? '#dcfce7' : '#fef9c3',
                          color: sm.mastery_level === 'mastered' ? '#166534' : '#854d0e',
                          textTransform: 'uppercase',
                          fontWeight: 600
                        }}>
                          {sm.mastery_level.replace('_', ' ')}
                        </span>
                        <span style={{ color: '#64748b', fontWeight: 600, width: '40px', textAlign: 'right' }}>
                          {sm.mastery_score}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#64748b' }}>No skills mastered yet. Complete some practice sessions to see them here!</p>
              )}
            </section>
          </div>

          {/* Sidebar Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Typing DNA
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Baseline WPM</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                    {dna?.baseline_wpm ?? dna?.avg_wpm ?? '--'}
                  </div>
                </div>
                
                {dna && dna.last_assessed_at && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Last Assessed</div>
                    <div style={{ fontSize: '1rem', color: '#334155', fontWeight: 500 }}>
                      {new Date(dna.last_assessed_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Weaknesses
              </h3>
              
              {dna?.weak_keys && Object.keys(dna.weak_keys).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {Object.entries(dna.weak_keys)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([key, score]) => (
                      <div key={key} style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: '#fee2e2', 
                        color: '#991b1b', 
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        border: '1px solid #fecaca'
                      }}>
                        {key === ' ' ? 'SPACE' : key.toUpperCase()}
                      </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No weaknesses detected yet. Keep practicing!</p>
              )}
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Recent Sessions
              </h3>
              
              {recentSessions.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {recentSessions.map((session, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i !== recentSessions.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      <span style={{ color: '#475569', fontSize: '0.875rem' }}>
                        {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', gap: '1rem', fontWeight: 600 }}>
                        <span style={{ color: '#2563eb' }}>{session.wpm}WPM</span>
                        <span style={{ color: '#16a34a' }}>{session.accuracy}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No recent sessions.</p>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
