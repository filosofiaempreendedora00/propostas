import type { Metadata } from "next";
import { LegalLayout, Section } from "@/app/_components/LegalLayout";

export const metadata: Metadata = {
  title: "Termos de Uso · Kronos",
  description:
    "Termos e condições de uso da Kronos, gerador de propostas comerciais com IA.",
};

const RAZAO = "[Razão Social] (CNPJ [•])";
const EMAIL = "contato@kronos-ias.com.br";

export default function Termos() {
  return (
    <LegalLayout
      title="Termos de Uso"
      updated="Agosto de 2026"
      intro={
        <>
          Estes Termos regem o uso da <strong>Kronos</strong>, plataforma de
          geração de propostas comerciais com inteligência artificial, operada por{" "}
          {RAZAO}. Ao criar uma conta ou usar a Kronos, você concorda com estes
          Termos e com a{" "}
          <a
            href="/politica-de-privacidade"
            className="font-medium text-[#6e5226] underline underline-offset-2"
          >
            Política de Privacidade
          </a>
          .
        </>
      }
    >
      <Section title="1. Aceitação e capacidade">
        <p>
          Ao acessar ou usar a Kronos, você declara ter <strong>18 anos ou mais</strong>{" "}
          e, se representar uma empresa, ter poderes para vinculá-la a estes
          Termos. Se não concordar, não use a plataforma.
        </p>
      </Section>

      <Section title="2. O que é a Kronos">
        <p>
          A Kronos ajuda você a criar um catálogo de serviços e a montar propostas
          comerciais persuasivas com apoio de IA. Você descreve seu negócio (ou
          envia documentos e transcrições de reuniões) e a IA gera e personaliza os
          textos. A Kronos é uma <strong>ferramenta de apoio</strong>: o conteúdo
          gerado é um ponto de partida que você revisa, edita e usa sob sua
          responsabilidade.
        </p>
      </Section>

      <Section title="3. Conta e informações">
        <p>
          Você se compromete a fornecer informações{" "}
          <strong>verdadeiras, exatas, atuais e completas</strong> (inclusive um
          WhatsApp válido para contato) e a manter suas credenciais em sigilo. Você
          é responsável pelas atividades feitas na sua conta. Podemos recusar,
          suspender ou encerrar contas com dados falsos, duplicados ou uso
          indevido.
        </p>
      </Section>

      <Section title="4. Uso permitido e proibido">
        <p>Você pode usar a Kronos para o seu negócio. É proibido:</p>
        <ul>
          <li>Copiar, modificar ou revender a plataforma sem autorização.</li>
          <li>
            Fazer engenharia reversa, scraping ou usar robôs/crawlers/dispositivos
            automatizados.
          </li>
          <li>Introduzir malware ou tentar acesso não autorizado.</li>
          <li>
            Contornar limites de uso (inclusive as cotas de geração por IA) ou
            sobrecarregar o serviço.
          </li>
          <li>
            Gerar conteúdo ilícito, enganoso, ofensivo ou que viole direitos de
            terceiros.
          </li>
          <li>Usar marcas e logos da Kronos sem autorização.</li>
        </ul>
        <p>Violações podem levar ao bloqueio imediato do acesso.</p>
      </Section>

      <Section title="5. Conteúdo, propriedade e licença">
        <p>
          A <strong>plataforma</strong> (software, código, design, marca e textos
          da Kronos) pertence à Kronos e é protegida por lei. O{" "}
          <strong>conteúdo que você cria</strong> (catálogo, propostas e os
          arquivos que envia) é seu.
        </p>
        <p>
          Para prestar o serviço, você concede à Kronos uma licença limitada para
          armazenar e processar esse conteúdo — inclusive enviá-lo ao nosso
          provedor de IA (Anthropic) — com o único fim de gerar e personalizar seu
          catálogo e suas propostas. Você declara ter os direitos necessários sobre
          os dados e arquivos que inserir.
        </p>
      </Section>

      <Section title="6. Sobre o conteúdo gerado por IA">
        <p>
          O conteúdo é produzido por IA e{" "}
          <strong>pode conter imprecisões</strong>. Revise tudo antes de enviar a
          um cliente. Números, prazos, preços e afirmações são de sua
          responsabilidade. A Kronos <strong>não garante</strong> resultados de
          vendas, conversão ou qualquer desempenho comercial decorrente do uso das
          propostas.
        </p>
      </Section>

      <Section title="7. Planos, assinatura e pagamento">
        <p>
          A Kronos oferece uso gratuito com <strong>marca d&apos;água</strong> nos
          downloads e planos pagos que removem a marca e liberam mais recursos. As
          assinaturas são processadas pela <strong>Kiwify</strong>. Salvo indicação
          em contrário, a cobrança é recorrente até o cancelamento, que pode ser
          feito a qualquer momento e passa a valer no fim do ciclo vigente. Eventual
          garantia (ex.: 7 dias) é a informada na página de planos no momento da
          contratação.
        </p>
      </Section>

      <Section title="8. Disponibilidade e limitação de responsabilidade">
        <p>
          Nos esforçamos para manter o serviço estável, mas{" "}
          <strong>não garantimos acesso ininterrupto ou livre de erros</strong>. Na
          máxima extensão permitida por lei, a Kronos não se responsabiliza por:
        </p>
        <ul>
          <li>Indisponibilidades por manutenção ou fatores externos.</li>
          <li>Conteúdo gerado por IA e decisões de negócio tomadas a partir dele.</li>
          <li>Uso indevido da plataforma por você ou por terceiros.</li>
          <li>Serviços de terceiros integrados (IA, pagamento, hospedagem, etc.).</li>
        </ul>
      </Section>

      <Section title="9. Suspensão e encerramento">
        <p>
          Podemos bloquear, suspender ou encerrar o acesso em caso de violação
          destes Termos. Você pode encerrar sua conta quando quiser — o tratamento
          de dados após o encerramento segue a Política de Privacidade.
        </p>
      </Section>

      <Section title="10. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos a qualquer tempo, publicando a nova versão
          com a data de revisão. O uso continuado após a atualização implica
          concordância.
        </p>
      </Section>

      <Section title="11. Lei aplicável e contato">
        <p>
          Estes Termos são regidos pela lei brasileira (Código Civil, CDC, Marco
          Civil da Internet — Lei nº 12.965/2014 — e LGPD — Lei nº 13.709/2018).
          Fica eleito o foro do domicílio da Kronos. Dúvidas:{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
