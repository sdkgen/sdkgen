Pod::Spec.new do |spec|  
  spec.name                    = 'SdkgenRuntime'
  spec.version                 = '0.6.0-iospreview'
  spec.summary                 = 'sdkgen is a tool to help design, implement and maintain good APIs with minimal effor.'

  spec.author                  = 'Cubos'
  spec.license                 = 'MIT'
  spec.homepage                = 'https://sdkgen.github.io'
  spec.documentation_url       = 'https://sdkgen.github.io'

  spec.source                  = { :git => 'https://github.com/sdkgen/sdkgen.git', :tag => spec.version }

  spec.source_files            = 'ios-runtime/SdkgenRuntime/Classes/**/*.swift'

  spec.platform                = :ios
  spec.ios.deployment_target   = '12.1'
  spec.swift_version           = ['5.1', '5.2', '5.3']

  spec.dependency 'Alamofire', '~> 5.4.3'
  spec.dependency 'KeychainSwift'
  spec.dependency 'DeviceKit', '~> 4.9.0'

end 
