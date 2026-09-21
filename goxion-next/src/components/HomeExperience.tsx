import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

type LegalModal = 'terms' | 'guarantee' | null;

const FAQS = [
  {
    q: '¿Cuáles son los métodos de pago?',
    a: 'Puedes realizar tu pago con los datos bancarios mostrados en tu estado de cuenta. Para que sea válido, reporta el comprobante directamente desde GOXION.',
  },
  {
    q: '¿Qué pasa si me atraso un día en mi pago?',
    a: 'Un atraso puede generar un recargo del 5% diario, con el límite configurado por GOXION. Si necesitas revisar una situación especial, utiliza Soporte desde Mi Espacio.',
  },
  {
    q: '¿Puedo cambiar la contraseña de mi perfil?',
    a: 'Puedes personalizar el PIN de un perfil cuando el servicio lo permita. No cambies el correo ni la contraseña general de una cuenta administrada por GOXION.',
  },
  {
    q: '¿Cómo funciona el beneficio por referido?',
    a: 'El referido debe cumplir los requisitos de plataformas activas y permanencia. Cuando GOXION detecta que el ciclo está completo, el beneficio puede reclamarse desde Mi Espacio.',
  },
];

export function HomeExperience({ onCatalog }: { onCatalog: () => void }) {
  const [faq, setFaq] = useState<number | null>(null);
  const [legal, setLegal] = useState<LegalModal>(null);

  return (
    <>
      <section className="gx-home-experience">
        <div className="gx-help-section-head gx-help-section-simple">
          <div>
            <span className="gx-help-section-kicker">ASÍ DE SIMPLE</span>
            <h2>¿Cómo funciona GOXION?</h2>
          </div>
        </div>

        <div className="gx-how-grid">
          {[
            ['01', '◈', 'Elige tu servicio', 'Selecciona la plataforma o producto que necesitas desde nuestro catálogo.'],
            ['02', '▣', 'Realiza tu pedido', 'Define la cantidad y envía tu solicitud directamente desde GOXION.'],
            ['03', '✦', 'Recibe tu acceso', 'Tras la validación correspondiente, tus accesos quedan disponibles para comenzar a disfrutar.'],
          ].map(([number, icon, title, copy], index) => (
            <motion.article
              key={number}
              initial={{ opacity: 0, y: 9 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-35px' }}
              transition={{ delay: index * 0.05 }}
            >
              <span className="gx-how-number">{number}</span>
              <i>{icon}</i>
              <strong>{title}</strong>
              <p>{copy}</p>
            </motion.article>
          ))}
        </div>

        <motion.button
          type="button"
          className="gx-home-catalog-action"
          onClick={onCatalog}
          whileTap={{ scale: 0.985 }}
        >
          <span>Ver servicios disponibles</span>
          <i>→</i>
        </motion.button>
      </section>

      <section className="gx-home-experience">
        <div className="gx-help-section-head gx-help-section-simple">
          <div>
            <span className="gx-help-section-kicker">CONFIANZA GOXION</span>
            <h2>¿Por qué comprar aquí?</h2>
          </div>
        </div>

        <div className="gx-trust-grid">
          {[
            ['⚡', 'Activación ágil', 'Seguimiento claro desde que registras tu pedido hasta que recibes tu acceso.'],
            ['🛡', 'Trato Justo', 'Si una falla técnica aplica, GOXION calcula la compensación correspondiente.'],
            ['✦', 'Soporte dedicado', 'Tu solicitud llega con el contexto de tu cuenta y servicio, sin repetir información.'],
            ['◉', 'Espacio protegido', 'Sesiones, PIN y credenciales sensibles usan flujos separados y controlados.'],
          ].map(([icon, title, copy]) => (
            <article key={title}>
              <span>{icon}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gx-home-postpurchase">
        <div>
          <span className="gx-help-section-kicker">DESPUÉS DE TU COMPRA</span>
          <h2>Tu servicio, sin complicaciones</h2>
          <p>
            Tus servicios quedan ligados a Mi Espacio para consultar accesos,
            estado de cuenta, beneficios y soporte desde un mismo lugar.
          </p>
        </div>

        <div className="gx-postpurchase-flow">
          {[
            ['01', 'Reportas'],
            ['02', 'Revisamos'],
            ['03', 'Resolvemos'],
          ].map(([n, label], index) => (
            <div key={n}>
              <span>{n}</span>
              <strong>{label}</strong>
              {index < 2 && <i />}
            </div>
          ))}
        </div>
      </section>

      <section className="gx-home-experience">
        <div className="gx-help-section-head gx-help-section-simple">
          <div>
            <span className="gx-help-section-kicker">AYUDA RÁPIDA</span>
            <h2>Preguntas frecuentes</h2>
          </div>
        </div>

        <div className="gx-faq-list">
          {FAQS.map((item, index) => {
            const open = faq === index;
            return (
              <motion.article layout key={item.q}>
                <button
                  type="button"
                  onClick={() => setFaq(open ? null : index)}
                  aria-expanded={open}
                >
                  <strong>{item.q}</strong>
                  <motion.span animate={{ rotate: open ? 180 : 0 }}>⌄</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="gx-home-legal">
        <div>
          <strong>Reglas claras, siempre disponibles</strong>
          <small>Consulta las condiciones que respaldan tu servicio.</small>
        </div>
        <div>
          <button type="button" onClick={() => setLegal('terms')}>
            Términos
          </button>
          <button type="button" onClick={() => setLegal('guarantee')}>
            Garantía y Trato Justo
          </button>
        </div>
      </section>

      <AnimatePresence>
        {legal && (
          <motion.div
            className="gx-legal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLegal(null);
            }}
          >
            <motion.section
              className="gx-legal-sheet"
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <button
                type="button"
                className="gx-legal-close"
                onClick={() => setLegal(null)}
              >
                ×
              </button>

              {legal === 'terms' ? (
                <>
                  <span className="gx-help-section-kicker">GOXION</span>
                  <h2>Términos y Condiciones</h2>
                  <p>
                    Al utilizar un servicio GOXION, el cliente acepta las reglas
                    de uso, pago y seguridad aplicables a su cuenta.
                  </p>
                  <ol>
                    <li>
                      <strong>Confidencialidad.</strong> Credenciales, enlaces y
                      accesos son personales y no deben compartirse con terceros
                      no autorizados.
                    </li>
                    <li>
                      <strong>Uso permitido.</strong> Las cuentas deben utilizarse
                      conforme al servicio contratado y a las reglas de cada
                      plataforma.
                    </li>
                    <li>
                      <strong>Dispositivos.</strong> Los cambios de dispositivo o
                      uso simultáneo deben respetar las condiciones indicadas por
                      GOXION para cada servicio.
                    </li>
                    <li>
                      <strong>Pagos.</strong> La fecha y el importe vigentes son
                      los que aparecen en Mi Espacio. El comprobante debe
                      reportarse desde GOXION para ser validado.
                    </li>
                    <li>
                      <strong>Incumplimiento.</strong> El uso no autorizado puede
                      provocar suspensión temporal o cancelación conforme a las
                      reglas del servicio.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <span className="gx-help-section-kicker">RESPALDO GOXION</span>
                  <h2>Garantía y Trato Justo</h2>
                  <p>
                    Las compensaciones y cargos se calculan de forma proporcional
                    sobre el periodo y servicio afectados.
                  </p>
                  <div className="gx-legal-rules">
                    <article>
                      <strong>Falla técnica</strong>
                      <span>5% de compensación diaria</span>
                      <small>Hasta 50% del servicio afectado.</small>
                    </article>
                    <article>
                      <strong>Mora</strong>
                      <span>5% de recargo diario</span>
                      <small>Hasta 50% del saldo aplicable.</small>
                    </article>
                    <article>
                      <strong>Reactivación</strong>
                      <span>20% cuando corresponda</span>
                      <small>Aplica conforme al estado de la cuenta.</small>
                    </article>
                  </div>
                  <p className="gx-legal-note">
                    El estado de cuenta calculado por GOXION es la referencia
                    vigente para descuentos, cargos y beneficios del periodo.
                  </p>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
