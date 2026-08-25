import type { Metadata } from "next";
import { LegalLayout, Section } from "@/app/_components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Privacidade · Kronos",
  description:
    "Como a Kronos coleta, usa, armazena e compartilha dados pessoais, em conformidade com a LGPD.",
};

const EMAIL = "contato@kronos-ias.com.br";

export default function PoliticaPrivacidade() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      updated="Agosto de 2026"
      intro={
        <>
          Esta Política descreve como a <strong>Kronos</strong> (a
          &ldquo;plataforma&rdquo;) coleta, utiliza, armazena e compartilha dados
          pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD —
          Lei nº 13.709/2018). Ao criar uma conta e usar a Kronos, você declara
          ter lido e compreendido esta Política.
        </>
      }
    >
      <Section title="1. Quem é o controlador">
        <p>
          A <strong>Kronos</strong> é a controladora dos dados, responsável por
          decidir sobre as finalidades e os meios de tratamento (art. 5º, VI, da
          LGPD). Para questões de privacidade, fale com a gente em{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <p>
          <strong>Dados que você fornece:</strong>
        </p>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, telefone/WhatsApp e senha.
          </li>
          <li>
            <strong>Conteúdo do seu negócio:</strong> descrições do seu negócio,
            serviços, planos e preços, além de arquivos que você enviar (ex.:
            documentos do negócio, transcrições de reuniões de venda) para que a
            IA gere seu catálogo e suas propostas.
          </li>
          <li>
            <strong>Dados dos consultores/clientes</strong> que você inserir para
            montar as propostas (nome, cargo, contato). Você é responsável por
            ter base legal para incluí-los.
          </li>
          <li>
            <strong>Suporte e comunicações</strong> que você nos envia.
          </li>
        </ul>
        <p>
          <strong>Dados coletados automaticamente:</strong>
        </p>
        <ul>
          <li>
            Endereço IP, tipo de navegador/sistema e informações do dispositivo.
          </li>
          <li>Páginas visitadas, tempo de sessão e fluxo de navegação.</li>
          <li>Origem de acesso (parâmetros UTM, gclid, fbclid, referrer).</li>
          <li>Identificadores de cookies e tecnologias similares.</li>
        </ul>
        <p>
          <strong>Pagamento:</strong> as assinaturas são processadas pela Kiwify.
          A Kronos <strong>não armazena dados de cartão</strong> — o pagamento é
          tratado diretamente pela plataforma de pagamento.
        </p>
      </Section>

      <Section title="3. Processamento por Inteligência Artificial">
        <p>
          A Kronos usa modelos de IA para gerar e personalizar seu catálogo e suas
          propostas. Para isso, os textos e arquivos que você fornece (descrições
          do negócio, documentos e transcrições) são enviados ao nosso provedor de
          IA, a <strong>Anthropic (Claude)</strong>, exclusivamente para produzir
          o conteúdo solicitado por você. Recomendamos não incluir dados
          sensíveis ou de terceiros sem a devida autorização.
        </p>
      </Section>

      <Section title="4. Para que usamos os dados">
        <ul>
          <li>Criar e manter sua conta e prestar o serviço (gerar propostas).</li>
          <li>
            Enviar comunicações da conta e de suporte, inclusive por e-mail e{" "}
            <strong>WhatsApp</strong>, no número informado.
          </li>
          <li>Comunicações comerciais e de marketing, quando autorizadas.</li>
          <li>Processar assinaturas e cobranças.</li>
          <li>Analisar uso e melhorar a experiência e o produto.</li>
          <li>Remarketing no Google e na Meta.</li>
          <li>Prevenir fraude e garantir a segurança.</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </Section>

      <Section title="5. Bases legais (art. 7º da LGPD)">
        <ul>
          <li>
            <strong>Execução de contrato</strong> (V): criar a conta e prestar o
            serviço.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (IX): acompanhamento comercial,
            analytics e melhoria do produto.
          </li>
          <li>
            <strong>Consentimento</strong> (I): comunicações de marketing e
            contato por WhatsApp.
          </li>
          <li>
            <strong>Obrigação legal</strong> (II): cumprimento fiscal e
            regulatório.
          </li>
        </ul>
      </Section>

      <Section title="6. Com quem compartilhamos">
        <p>
          Compartilhamos dados apenas com parceiros necessários à operação, sob
          contrato e dever de confidencialidade:
        </p>
        <ul>
          <li>
            <strong>Anthropic</strong> (geração de conteúdo por IA).
          </li>
          <li>
            <strong>Supabase</strong> (autenticação e banco de dados) e{" "}
            <strong>Vercel</strong> (hospedagem).
          </li>
          <li>
            <strong>Brevo</strong> (e-mails e CRM) e{" "}
            <strong>Kiwify</strong> (pagamentos).
          </li>
          <li>
            <strong>Google</strong> e <strong>Meta</strong> (analytics e anúncios).
          </li>
          <li>Autoridades públicas, quando exigido por lei.</li>
        </ul>
        <p>
          <strong>
            Não vendemos, alugamos ou transferimos dados pessoais a terceiros para
            fins comerciais próprios deles.
          </strong>
        </p>
      </Section>

      <Section title="7. Transferência internacional">
        <p>
          Alguns operadores (como Anthropic, Google, Meta, Supabase, Vercel e
          Brevo) processam dados em servidores fora do Brasil. Essas
          transferências ocorrem com as garantias do art. 33 da LGPD (cláusulas
          contratuais e salvaguardas dos fornecedores).
        </p>
      </Section>

      <Section title="8. Por quanto tempo guardamos">
        <ul>
          <li>
            <strong>Dados da conta e do negócio:</strong> enquanto a conta existir
            e por até 5 anos após o encerramento ou a revogação do consentimento.
          </li>
          <li>
            <strong>Dados de navegação/analytics:</strong> até 14 meses (padrão do
            Google Analytics 4).
          </li>
          <li>
            <strong>Registros de acesso:</strong> 6 meses (Marco Civil da
            Internet).
          </li>
          <li>Obrigações legais: pelo prazo da legislação aplicável.</li>
        </ul>
        <p>
          Após esses prazos, os dados são eliminados, anonimizados ou arquivados
          com segurança (art. 16 da LGPD).
        </p>
      </Section>

      <Section title="9. Seus direitos (art. 18 da LGPD)">
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>Confirmar a existência de tratamento e acessar seus dados.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>
            Solicitar anonimização, bloqueio ou eliminação de dados desnecessários
            ou tratados em desconformidade.
          </li>
          <li>Solicitar a portabilidade.</li>
          <li>Revogar o consentimento e se opor a tratamentos.</li>
          <li>Ser informado sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>
          Para exercer, escreva para{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — respondemos em até 15 dias.
          Podemos pedir confirmação de identidade. Reclamações também podem ser
          levadas à ANPD (gov.br/anpd).
        </p>
      </Section>

      <Section title="10. Segurança">
        <p>
          Adotamos medidas como criptografia HTTPS/TLS, controle de acesso por
          função, monitoramento e avaliação periódica de fornecedores. Ainda
          assim, <strong>nenhuma transmissão pela internet é 100% segura</strong>.
          Em caso de incidente relevante, notificamos a ANPD e os titulares
          afetados, conforme o art. 48 da LGPD.
        </p>
      </Section>

      <Section title="11. Cookies">
        <p>Usamos cookies e tecnologias similares para:</p>
        <ul>
          <li>
            <strong>Essenciais:</strong> funcionamento básico e login (sessão).
          </li>
          <li>
            <strong>Analytics:</strong> medir uso e conversão (ex.: Google
            Analytics 4).
          </li>
          <li>
            <strong>Marketing:</strong> remarketing e conversão (Meta Pixel,
            Google Ads).
          </li>
        </ul>
        <p>
          Você pode bloquear ou apagar cookies nas configurações do navegador —
          desativá-los pode afetar sua experiência.
        </p>
      </Section>

      <Section title="12. Menores de idade">
        <p>
          A Kronos é destinada a profissionais maiores de 18 anos. Não coletamos
          intencionalmente dados de menores; se identificarmos, os eliminamos.
        </p>
      </Section>

      <Section title="13. Alterações desta Política">
        <p>
          Podemos atualizar esta Política por razões legais, operacionais ou
          técnicas. A data de revisão fica sempre no topo. Mudanças relevantes são
          comunicadas no serviço e/ou por e-mail.
        </p>
      </Section>

      <Section title="14. Lei aplicável">
        <p>
          Esta Política é regida pela lei brasileira. Fica eleito o foro do
          domicílio da controladora para dirimir questões dela decorrentes.
        </p>
      </Section>
    </LegalLayout>
  );
}
