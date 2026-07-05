import React from 'react';
import Badge from './Badge';
import { Info } from 'lucide-react';

interface PropertyItem {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
}

export function PropertyTable(props: any) {
  // Use let to allow parsing if it's a string
  let items = props.items;
  
  if (typeof items === 'string') {
    try {
      // Use relaxed evaluation to support beautifully formatted multiline objects
      // even if keys are not strictly quoted like "name": "..."
      items = new Function("return " + items)();
    } catch (e) {
      console.error('Error parsing PropertyTable items:', items, e);
    }
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <div className="my-8 p-10 border-2 border-dashed border-white/10 rounded-3xl text-center text-sm bg-white/5 backdrop-blur-xl group">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
             <Info className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground/80 font-medium">No se detectaron propiedades válidas.</p>
          <code className="text-[10px] text-muted-foreground/40 mt-2">Recibido: {typeof props.items}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-3 font-bold text-foreground uppercase tracking-widest text-[10px]">Propiedad</th>
              <th className="px-6 py-3 font-bold text-foreground uppercase tracking-widest text-[10px]">Tipo</th>
              <th className="px-6 py-3 font-bold text-foreground uppercase tracking-widest text-[10px] text-center">Requerido</th>
              <th className="px-6 py-3 font-bold text-foreground uppercase tracking-widest text-[10px]">Default</th>
              <th className="px-6 py-3 font-bold text-foreground uppercase tracking-widest text-[10px]">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items?.map((item: any, i: number) => (
              <tr key={i} className="group hover:bg-white/[0.02] transition-all duration-300">
                <td className="px-6 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-primary font-bold text-xs tracking-tight group-hover:translate-x-1 transition-transform">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <Badge variant={
                    item.type?.toLowerCase().includes('string') ? 'info' : 
                    item.type?.toLowerCase().includes('boolean') ? 'success' : 
                    item.type?.toLowerCase().includes('number') ? 'warning' : 
                    item.type?.toLowerCase().includes('function') ? 'purple' : 'outline'
                  } className="font-mono text-[9px] px-2 py-0">
                    {item.type}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-center">
                  {item.required ? (
                    <div className="flex justify-center">
                      <div className="relative h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                         <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30 text-[10px] uppercase font-bold">-</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <code className="text-[10px] text-muted-foreground font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                    {item.default || 'none'}
                  </code>
                </td>
                <td className="px-6 py-3 max-w-sm">
                  <p className="text-muted-foreground/90 leading-relaxed text-[11px]">
                    {item.description}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-8 py-3 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground/40 font-bold uppercase tracking-tighter">
         <span>API Documentation System</span>
         <span className="flex items-center gap-1.5"><Info className="w-3 h-3" /> Hover for details</span>
      </div>
    </div>
  );
}

export default PropertyTable;
