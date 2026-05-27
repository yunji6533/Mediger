import boto3
from .config import BEDROCK_REGION, BEDROCK_KB_REGION

_runtime = None
_agent = None


#LLM 호출 
def get_runtime():
    global _runtime
    if _runtime is None:
        _runtime = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
    return _runtime

# RAG 검색요
def get_agent():
    global _agent
    if _agent is None:
        _agent = boto3.client('bedrock-agent-runtime', region_name=BEDROCK_KB_REGION)
    return _agent
