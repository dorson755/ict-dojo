import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { PokemonRepository } from '@/lib/aws/repositories/pokemon.repository';
import { getBeltName } from '@/domains/shared/belt-names';
import TrailsClient from './TrailsClient';
import styles from './trails.module.css';

export default async function PokemonTrailsPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level) redirect('/onboarding');
  const collection = await PokemonRepository.get(user.id);
  return (
    <div className={styles.page}>
      <Link href="/games" className={styles.back}>
        Back to games
      </Link>
      <header className={styles.header}>
        <div>
          <h1>Pokémon Typing Trails</h1>
          <p>A little accuracy. A lifelong companion.</p>
        </div>
        <span className={styles.belt}>{getBeltName(access.belt)} belt words</span>
      </header>
      <TrailsClient initialCollection={collection} />
      <footer className={styles.credits}>
        An independent ICT Dojo typing adventure. Pokémon artwork and names © Nintendo / Creatures
        Inc. / GAME FREAK Inc. Not affiliated with or endorsed by these companies.{' '}
        <a href="/pokemon-trails/ASSET-CREDITS.md">Asset credits</a>
      </footer>
    </div>
  );
}
