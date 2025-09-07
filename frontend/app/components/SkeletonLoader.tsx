'use client';
import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{ width, height }}
    />
  );
};

export const ResolutionHeaderSkeleton: React.FC = () => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl shadow-blue-100/50 overflow-hidden relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      
      {/* Top Navigation Bar Skeleton */}
      <div className="relative flex items-center justify-between p-6 border-b border-gray-100/50">
        <Skeleton className="w-24 h-10 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="w-28 h-11 rounded-xl" />
          <Skeleton className="w-32 h-11 rounded-xl" />
        </div>
      </div>
      
      {/* Main Header Content Skeleton */}
      <div className="relative p-8 lg:p-10">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
          {/* Title Section Skeleton */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="w-16 h-16 rounded-2xl" />
              <div>
                <Skeleton className="w-72 h-10 mb-2" />
                <Skeleton className="w-56 h-5" />
              </div>
            </div>
            
            {/* Metadata Tags Skeleton */}
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="w-28 h-10 rounded-lg" />
              <Skeleton className="w-36 h-10 rounded-lg" />
              <Skeleton className="w-32 h-10 rounded-lg" />
            </div>
          </div>
          
          {/* Stats Section Skeleton */}
          <div className="flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="text-center">
              <Skeleton className="w-24 h-10 rounded-xl mb-2" />
              <Skeleton className="w-20 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResolutionDetailsSkeleton: React.FC = () => {
  return (
    <div className="bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-lg shadow-gray-100/50">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-36 h-7" />
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-32 h-4" />
              </div>
            ))}
          </div>
          
          <div className="flex flex-col justify-center">
            <div className="text-center mb-3">
              <Skeleton className="w-16 h-10 mx-auto mb-1" />
              <Skeleton className="w-20 h-3 mx-auto" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Skeleton className="w-24 h-5 mb-3" />
          <div className="space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const InteractionsSkeleton: React.FC = () => {
  return (
    <div className="bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg shadow-gray-100/50">
      <div className="border-b border-gray-100/50 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-20 h-7" />
            <Skeleton className="w-10 h-6 rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="p-8">
        <div className="border border-gray-100 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-24 h-5" />
            <Skeleton className="w-6 h-5 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-20 h-4" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="border border-gray-100 rounded-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
            </div>
            <Skeleton className="w-48 h-3 mt-1" />
          </div>
          
          <div className="h-96 p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs lg:max-w-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                  <Skeleton className="w-full h-16 rounded-lg" />
                  <Skeleton className="w-32 h-3 mt-1" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t bg-white rounded-b-xl">
            <Skeleton className="w-full h-20 rounded-lg mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-20 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 