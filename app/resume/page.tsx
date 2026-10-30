import type { Metadata } from 'next';
import { ArrowUpRight, Mail, MapPin } from 'lucide-react';
import resume from '@/content/resume.json';
import { BlurFade } from '@/components/magicui/blur-fade';
import styles from './resume.module.css';

export const metadata: Metadata = {
  title: '简历',
  description: resume.summary,
  alternates: { canonical: '/resume' },
};

const sections = [
  ['skills', '核心能力'], ['experience', '工作经历'], ['projects', '项目经历'],
  ['contributions', '开源贡献'], ['education', '教育背景'],
];

export default function ResumePage() {
  return <article className={styles.resume}>
    <BlurFade>
      <header className={styles.intro}>
        <div className="eyebrow">RESUME / 简历</div>
        <h1>{resume.name}<span>持续构建，持续学习。</span></h1>
        <p className={styles.role}>{resume.role}</p>
        <p className={styles.summary}>{resume.summary}</p>
        <div className={styles.contact}>
          <span><MapPin size={15} aria-hidden="true" />{resume.location}</span>
          <a href={'mailto:' + resume.email}><Mail size={15} aria-hidden="true" />{resume.email}</a>
          <a href={resume.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </header>
    </BlurFade>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label="简历目录">{sections.map(([id, title], index) => <a key={id} href={'#' + id}><span>0{index + 1}</span>{title}</a>)}</nav>
        <p>更新于 {resume.updatedAt}</p>
      </aside>
      <div className={styles.body}>
        <section id="skills" aria-labelledby="skills-title">
          <h2 id="skills-title">核心能力</h2>
          <div className={styles.skills}>{resume.skills.map(skill => <div key={skill.title}><h3>{skill.title}</h3><p>{skill.text}</p></div>)}</div>
        </section>
        <section id="experience" aria-labelledby="experience-title">
          <h2 id="experience-title">工作经历</h2>
          <div className={styles.timeline}>{resume.experience.map(job => <div className={styles.job} key={job.company}>
            <div className={styles.itemHead}><h3>{job.company}</h3><span>{job.period}</span></div>
            <p className={styles.subtitle}>{job.role}</p>
            <ul>{job.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
          </div>)}</div>
        </section>
        <section id="projects" aria-labelledby="projects-title">
          <h2 id="projects-title">项目经历</h2>
          {resume.projects.map((project, index) => <div className={styles.project} key={project.title}>
            <span className={styles.projectNumber}>0{index + 1}</span>
            <div><h3>{project.title}</h3><p className={styles.subtitle}>{project.role}</p>
              <p>{project.description}</p><ul>{project.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
            </div>
          </div>)}
        </section>
        <section id="contributions" aria-labelledby="contributions-title">
          <h2 id="contributions-title">开源贡献</h2>
          <div className={styles.contributions}>{resume.contributions.map(item => <a href={item.url} key={item.url} target="_blank" rel="noreferrer">
            <div><h3>{item.title}</h3><p>{item.description}</p></div><span>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></span>
          </a>)}</div>
        </section>
        <section id="education" aria-labelledby="education-title">
          <h2 id="education-title">教育背景</h2>
          <div className={styles.itemHead}><h3>{resume.education.school}</h3><span>{resume.education.period}</span></div>
          <p>{resume.education.degree}</p><p className={styles.subtitle}>{resume.education.qualifications}</p>
        </section>
      </div>
    </div>
  </article>;
}
