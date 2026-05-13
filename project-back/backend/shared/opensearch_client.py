import boto3  #Opensearch boto3
from opensearchpy import OpenSearch, RequestsHttpConnection # Opensearch 공식 python 클라이언트 
from requests_aws4auth import AWS4Auth
from .config import OPENSEARCH_ENDPOINT, OPENSEARCH_REGION

#_client 변수에 Opensearch 연결을 저장해두고 필요할 때 꺼내 씀 
_client = None

# Opensearch에 안전하게 연결 
def get_client() -> OpenSearch:
    global _client
    if _client is None:
        creds = boto3.Session().get_credentials().get_frozen_credentials()
        auth = AWS4Auth(
            creds.access_key,
            creds.secret_key,
            OPENSEARCH_REGION,
            'es',
            session_token=creds.token,
        )
        _client = OpenSearch(
            hosts=[{'host': OPENSEARCH_ENDPOINT, 'port': 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            timeout=30,
        )
    return _client
