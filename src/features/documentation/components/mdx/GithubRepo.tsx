'use client';

import React from 'react';
import { Star, GitFork, ExternalLink, BookOpen } from 'lucide-react';
import DynamicIcon from '@/features/documentation/components/DynamicIcon';

interface GithubRepoProps {
  url: string;
  title?: string;
  description?: string;
  stars?: string | number;
  forks?: string | number;
  language?: string;
  languageColor?: string;
}

export function GithubRepo({ 
  url, 
  title, 
  description, 
  stars, 
  forks, 
  language = 'TypeScript',
  languageColor = '#3178c6' 
}: GithubRepoProps) {
  // Extract owner/repo from URL if title is not provided
  const repoName = title || url.split('/').slice(-2).join('/');
  
  return (
    <div className="my-8 group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:shadow-2xl hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 text-foreground group-hover:scale-110 transition-transform flex items-center justify-center">
            <DynamicIcon icon="lucide:github" className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1 group-hover:text-primary transition-colors">
              {repoName}
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            {description && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        {language && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: languageColor }}
            />
            {language}
          </div>
        )}
        
        {stars !== undefined && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Star className="w-4 h-4 text-yellow-500/80" />
            {stars}
          </div>
        )}

        {forks !== undefined && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GitFork className="w-4 h-4 text-primary/70" />
            {forks}
          </div>
        )}
      </div>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`View ${repoName} on GitHub`}
      />

      {/* Decorative background glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
