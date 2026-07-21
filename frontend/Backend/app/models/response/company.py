from typing import List
from app.models.domain.company import Company
from app.models.response.base import ApiResponse

CompanyResponse = ApiResponse[Company]
CompanyListResponse = ApiResponse[List[Company]]
