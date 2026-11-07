// Lucian UX/UI Prompt #271 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#271
import Link from 'next/link';
import './lucian-271.css';
import './career-timeline.css';

type Event = { id: string; period: string; title: string; detail: string; ongoing: boolean };

export default function LifeTimeline({ events }: { events: Event[] }) {
  return <div className="ux u271 career-timeline">
    <ol className="u271-tl" aria-label="人生履历时间线">
      {events.map((event) => <li className="u271-en" key={event.id}>
        <div><article className="u271-in" aria-labelledby={`career-${event.id}`}>
          <span className={`u271-dt${event.ongoing ? ' is-new' : ''}`} aria-hidden="true" />
          <div className="u271-mt"><b>{event.period}</b></div>
          <div className="career-copy">
            <h3 id={`career-${event.id}`}><Link href={`/records/${event.id}`}>{event.title}<span className="career-arrow" aria-hidden="true">↗</span></Link></h3>
            <p>{event.detail}</p>
          </div>
        </article></div>
      </li>)}
    </ol>
  </div>;
}
