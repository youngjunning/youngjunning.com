'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Mail, MapPin } from 'lucide-react';
import resume from '@/content/resume.json';
import { BlurFade } from '@/components/magicui/blur-fade';
import styles from './resume.module.css';

const roles = {
  browser: {
    label: 'AI Browser 开发工程师',
    file: '杨俊宁_Agent Browser 开发工程师_简历',
  },
  application: {
    label: 'AI 应用开发工程师',
    file: '杨俊宁_AI 应用开发工程师_简历',
  },
} as const;

type Role = keyof typeof roles;

const sections = [
  ['skills', '核心能力'], ['experience', '工作经历'], ['projects', '项目经历'],
  ['contributions', '开源贡献'], ['education', '教育背景'],
];

export default function ResumeSwitcher() {
  const [selectedRole, setSelectedRole] = useState<Role>('browser');
  const selected = roles[selectedRole];

  return <article className={styles.resume}>
    <BlurFade>
      <header className={styles.intro}>
        <div className="eyebrow">RESUME / 简历</div>
        <h1>{resume.name}<span>持续构建，持续学习。</span></h1>
        <div className={styles.roleSwitch} role="group" aria-label="选择简历岗位">
          {(Object.entries(roles) as [Role, typeof roles[Role]][]).map(([key, role]) =>
            <button
              key={key}
              type="button"
              className={`${styles.roleOption} ${key === selectedRole ? styles.roleOptionActive : ''}`}
              aria-pressed={key === selectedRole}
              aria-controls="resume-profile"
              onClick={() => setSelectedRole(key)}
            >
              <strong>{role.label}</strong>
            </button>
          )}
        </div>
        <div id="resume-profile" aria-live="polite">
          <p className={styles.role}>应聘岗位：{selected.label}</p>
          <p className={styles.summary}>{resume.summary}</p>
        </div>
        <div className={styles.contact}>
          <span><MapPin size={15} aria-hidden="true" />{resume.location}</span>
          <a href={'mailto:' + resume.email}><Mail size={15} aria-hidden="true" />{resume.email}</a>
          <a href={resume.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
        <div className={styles.downloadPanel} aria-label={`${selected.label}简历下载`}>
          <div><strong>{selected.label}</strong><p>下载当前岗位版本</p></div>
          <div className={styles.downloadLinks}>
            <a href={`/resumes/${selected.file}.pdf`} download><ArrowDownToLine size={15} aria-hidden="true" />PDF</a>
            <a href={`/resumes/${selected.file}.docx`} download>可编辑 Word</a>
            <a href={`/resumes/${selected.file}.html`} download>Kami 原稿</a>
          </div>
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
