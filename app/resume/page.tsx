import type { Metadata } from 'next';
import resume from '@/content/resume.json';
import ResumeSwitcher from './resume-switcher';

export const metadata: Metadata = {
  title: '简历',
  description: resume.summary,
  alternates: { canonical: '/resume' },
};

export default function ResumePage() {
  return <ResumeSwitcher />;
}
