import json
import re
from openai import OpenAI

def smart_rule_based_split(text: str):
    """
    Offline fallback that cleanly segments raw lyrics or notes into 2-to-4 line projection slides.
    """
    lines = [line.strip() for line in text.strip().split("\n")]
    slides = []
    current_type = "Slide"
    current_chunk = []
    
    # Common section markers
    section_patterns = {
        r'^(verso|verse|estrofe)\s*(\d+)?': "Verso",
        r'^(refrão|refrao|chorus)': "Refrão",
        r'^(ponte|bridge)': "Ponte",
        r'^(pré-refrão|pre-chorus|pre-refrão)': "Pré-Refrão",
        r'^(intro|introdução)': "Intro",
        r'^(final|outro|conclusão)': "Final",
        r'^(ministração|ministracao)': "Ministração"
    }

    title_candidate = "Novo Louvor"
    artist_candidate = "Igreja Remidos em Cristo"
    
    # Check if first non-empty line looks like Title or Title - Artist
    non_empty = [l for l in lines if l]
    if non_empty:
        first = non_empty[0]
        if any(first.lower().startswith(p) for p in ["música:", "musica:", "título:", "titulo:", "louvor:"]):
            cleaned = re.sub(r'^(música|musica|título|titulo|louvor)\s*:\s*', '', first, flags=re.IGNORECASE).strip()
            if " - " in cleaned:
                parts = cleaned.split(" - ", 1)
                title_candidate = parts[0].strip()
                artist_candidate = parts[1].strip()
            else:
                title_candidate = cleaned
            lines = [l for l in lines if l != first]
        elif " - " in first and len(first) < 80:
            parts = first.split(" - ", 1)
            title_candidate = parts[0].strip()
            artist_candidate = parts[1].strip()
            lines = [l for l in lines if l != first]
        elif len(first) < 45 and not any(re.match(p, first.lower()) for p in section_patterns) and not first.endswith(('.', ',', ';')):
            title_candidate = first
            lines = [l for l in lines if l != first]

    for line in lines:
        if not line:
            if current_chunk:
                slides.append({
                    "type": current_type,
                    "text": "\n".join(current_chunk)
                })
                current_chunk = []
            continue
            
        # Check for section header like [Refrão] or Refrão:
        cleaned_header = re.sub(r'[\[\]\(\)\:]', '', line).strip().lower()
        matched_section = None
        for pattern, label in section_patterns.items():
            if re.match(pattern, cleaned_header):
                matched_section = label
                break
                
        if matched_section:
            if current_chunk:
                slides.append({
                    "type": current_type,
                    "text": "\n".join(current_chunk)
                })
                current_chunk = []
            current_type = matched_section
            continue
            
        # Add line
        current_chunk.append(line)
        # Keep slides to maximum 2 or 3 lines for clean projector view
        if len(current_chunk) >= 3:
            slides.append({
                "type": current_type,
                "text": "\n".join(current_chunk)
            })
            current_chunk = []
            
    if current_chunk:
        slides.append({
            "type": current_type,
            "text": "\n".join(current_chunk)
        })
        
    return {
        "title": title_candidate,
        "artist": artist_candidate,
        "slides": slides
    }

def format_with_nvidia_nemotron(text: str, api_key: str, model: str = "nvidia/llama-3.1-nemotron-70b-instruct", mode: str = "worship"):
    """
    Calls NVIDIA NeMoTron via build.nvidia.com OpenAI-compatible endpoint.
    mode can be 'worship' (songs/lyrics) or 'sermon' (preaching transcription/notes).
    """
    if not api_key or not api_key.strip():
        # Fallback to local rule-based splitter
        res = smart_rule_based_split(text)
        res["note"] = "Processado via formatador offline inteligente (chave da NVIDIA API não configurada)."
        return res

    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key.strip()
    )

    if mode == "worship":
        system_prompt = """Você é um assistente especialista em produção de projeção e transmissão para igrejas cristãs.
Sua missão é receber uma letra de louvor ou transcrição musical bruta e transformá-la em slides perfeitos para projeção no telão (datashow/LED).

Diretrizes obrigatórias:
1. Divida a letra em estrofes estruturadas (Verso 1, Verso 2, Refrão, Ponte, Final).
2. Cada slide deve ter no MÁXIMO 2 a 4 linhas bem balanceadas e fáceis de ler no telão com fonte grande.
3. Não repita palavras ou gaguejos de transcrições brutas. Corrija pontuação e grafia sem alterar o sentido.
4. Identifique o Título do Louvor e o Artista/Ministério (se possível; se não souber, coloque 'Desconhecido').
5. Retorne ESTRITAMENTE um JSON válido com a seguinte estrutura, sem markdown ao redor:
{
  "title": "Nome do Louvor",
  "artist": "Nome do Artista ou Desconhecido",
  "slides": [
    {"type": "Verso 1", "text": "Linha 1 do slide\\nLinha 2 do slide"},
    {"type": "Refrão", "text": "Linha 1 do refrão\\nLinha 2 do refrão"}
  ]
}"""
    else: # sermon / notes
        system_prompt = """Você é um assistente de transmissão de igreja para transformar anotações ou transcrições de pregação em slides claros para o telão.
Diretrizes:
1. Extraia o tema/título da mensagem.
2. Crie slides curtos e objetivos com: Versículos Chave, Tópicos Principais, e Frases de Efeito/Impacto da pregação.
3. Cada slide deve conter no máximo 3 linhas bem legíveis.
4. Retorne ESTRITAMENTE um JSON válido no formato:
{
  "title": "Tema da Pregação",
  "artist": "Pregador / Mensagem",
  "slides": [
    {"type": "Tema", "text": "Título da Mensagem"},
    {"type": "Versículo", "text": "Referência Bíblica e texto"},
    {"type": "Tópico", "text": "Ponto 1...\\nExplicação curta"}
  ]
}"""

    try:
        response = client.chat.completions.create(
            model=model or "nvidia/llama-3.1-nemotron-70b-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Aqui está o texto bruto para formatar:\n\n{text}"}
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=2048
        )
        content = response.choices[0].message.content.strip()
        
        # Clean json backticks if present
        if content.startswith("```"):
            content = re.sub(r'^```(json)?\n', '', content)
            content = re.sub(r'\n```$', '', content)
            
        data = json.loads(content)
        data["note"] = f"Formatado com sucesso pela IA NVIDIA NeMoTron ({model})!"
        return data
    except Exception as e:
        print(f"Erro ao chamar NVIDIA NeMoTron API: {e}")
        fallback = smart_rule_based_split(text)
        fallback["note"] = f"Aviso: Erro na API NVIDIA ({str(e)}). Usando formatação inteligente local."
        return fallback
