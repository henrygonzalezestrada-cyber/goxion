# Animate UI · componentes originales incorporados en la beta GOXION

Origen: https://github.com/imskyleen/animate-ui
Archivos de upstream **sin modificar** copiados desde:
`apps/v2/registry/icons/{star,clock,circle-check,circle-x,file-check}/index.tsx`
Se compilan con React 19, Motion, `@animate-ui/react` 2 y esbuild en un módulo aislado, sin cambiar Index oficial.

### MIT + Commons Clause License Condition
Copyright (c) 2025 Elliot Sutton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, and distribute the Software as part of an application, website, or product, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

### Commons Clause Restriction

You may use this Software, including for any commercial purpose, so long as you do not sell or redistribute the components themselves in their original form—whether alone or in a bundle.

### No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

El icono `HeartCrack` procede de Lucide React (MIT), ya que Animate UI no publica un `heart-crack` animado; la animación de entrada usa Motion con el mismo spring que Animate UI. No se trazan ni dibujan íconos a mano.

Componentes de UI adaptados: `@animate-ui/react/primitives/base-ui/progress` (Progress Root, Track e Indicator de librería, transición tipo spring con stiffness 100, damping 30). No mezclar con porcentajes de aprobación: los valores indican solo etapas alcanzadas.
