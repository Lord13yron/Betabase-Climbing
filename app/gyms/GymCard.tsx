import Link from 'next/link'
import type { GymCardData } from './GymsDirectory'
import { GymFavoriteButton } from './GymFavoriteButton'
import { LayersIcon, MapPinIcon, PlayCircleIcon } from './icons'

// Stock fallbacks (bundled in /public/landing) used until gyms carry their own
// `image_url`. Chosen deterministically by id so a gym always shows the same
// photo across renders.
const FALLBACK_IMAGES = [
  '/landing/gym-exterior.png',
  '/landing/climbing-wall-hero.png',
  '/landing/sending-climb.png',
  '/landing/filming-climb.png',
  '/landing/outside-gym.png',
]
function fallbackImage(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length]
}

export function GymCard({
  gym,
  favorited,
  canFavorite,
}: {
  gym: GymCardData
  favorited: boolean
  canFavorite: boolean
}) {
  const img = gym.image ?? fallbackImage(gym.id)

  return (
    <div className="g-card">
      <Link href={`/gyms/${gym.id}`} className="g-card-link">
        <div className="g-card-media">
          <div
            className="g-card-img"
            style={{ backgroundImage: `url('${img}')` }}
          />
          <div className="g-card-grad" />
          <span className="g-badge">
            <LayersIcon />
            {gym.routesCount} routes
          </span>
        </div>
        <div className="g-card-body">
          <div className="g-card-types">{gym.typesLabel}</div>
          <h3 className="g-card-name">{gym.name}</h3>
          {gym.city && (
            <div className="g-card-loc">
              <MapPinIcon />
              {gym.city}
            </div>
          )}
          <div className="g-card-foot">
            <span className="g-beta">
              <PlayCircleIcon />
              {gym.beta} beta
            </span>
            {gym.setLabel && <span className="g-foot-meta">Set {gym.setLabel}</span>}
          </div>
        </div>
      </Link>
      {canFavorite && <GymFavoriteButton id={gym.id} favorited={favorited} />}
    </div>
  )
}
